# TODO

## Frontend
* Refactor the session creation: enumerators just choose from a list of pre-defined sessions instead of entering details manually.
* Get rid of aptitude scores and replace with randomised aptitudes
* Add CSV download feature in backend 
* In the slider app, show the children's names instead of "child 1" and "child 2"?
* for the survey questions, and image option

## Server setup
* Set up regular backups on the backend


## For Michelle
* Update survey JSON files



Ok, we need to refactor the frontend and backend apps, unfortunately. To start with, stash all the current changes and revert back to the latest commit. We're not going to need all the latest changes involving the sessions.json file. In fact, get rid of that sessions.json file and instead create a schools.json file that contains a list of schools represented by {"school_id": "foobar", "description": "bla bla", type: "treatment/control"}.

The main idea of the refactoring is that a session should no longer consist of surveys for both children and the parent. Instead, we should introduce two types of sessions: childSession and parentSession. This will require changes in the backend and the front end databases, models, etc.

The childSession model should have multiple fields:
- a random uuid
- enumerator ID
- school
- family ID (used to be "participant ID")
- child ID
- name
also adopt the other status and upload tracking fields etc. from the current session model

The parentSession model should also have multiple fields:
- a random uuid
- enumerator ID
- family ID
- name of child 1
- name of child 2
- group ("treatment" or "control") (used to be called session type, I think)
also adopt the other status and tracking fields from the current session model
and we need all the slider tracking, and upload tracking

On index.html, there should be two buttons at the top left: "New Child Session" and "New Parent Session". These should bring up modals to create the sessions. Moreover, each row in the tables will have only three actions: "start", "details" and "delete". The "type" column should be renamed "Session" and it should show "Child" or "Parent". As an added bonus, use different pastel backgrounds for the row depending on which session type it is.

For the child session, we want the modal to have multiple input fields: the enumerator ID (int, should be autopopulated if the user is logged in), school (should be a dropdown with data pulled "on the fly" from schools.json), family ID (string), child ID (string), and name of child. The random uuid doesn't need to be shown, and can be generated in the background.

For the parent session, we want the modal to have multiple input fields as well: the enumerator ID (int, should be autopopulated if the user is logged in), school (should be a dropdown with data pulled "on the fly" from schools.json), family ID (string), and the names of the two children. The random uuid doesn't need to be shown, and can be generated in the background. Moreover, the group should be populated correctly in the background by checking schools.json for the correct value determined by the school.

How does this fit in with the SurveyResponse and SliderResponse models? We know that SliderResponses always belong to parent sessions.

## Database Architecture Solution: Joined Table Inheritance

### Overview
Use SQLAlchemy's Joined Table Inheritance pattern to create two session types that share a base table. This allows SurveyResponse to have a single foreign key that works for both session types.

### Backend: Three-Table Structure

**1. Base `session` table (shared fields only):**
- id (PK, UUID)
- session_type ('child' or 'parent') - discriminator column
- enumerator_id (FK to user.id)
- created_at
- uploaded_at
- upload_status

**2. `child_session` table (child-specific fields):**
- id (PK, FK to session.id) - shares same ID as base session
- family_id
- child_id
- name
- school
- survey_status
- survey_completed_at

**3. `parent_session` table (parent-specific fields):**
- id (PK, FK to session.id) - shares same ID as base session
- family_id
- child1_name
- child2_name
- school
- group_type ('treatment' or 'control')
- preEarnings1
- preEarnings2
- survey_status
- survey_completed_at
- slider_status
- slider_started_at
- slider_completed_at

### SQLAlchemy Model Structure

```python
class Session(db.Model):
    __tablename__ = 'session'
    id = db.Column(db.String(255), primary_key=True)
    session_type = db.Column(db.String(50), nullable=False)
    # ... other shared fields

    __mapper_args__ = {
        'polymorphic_on': session_type,
        'polymorphic_identity': 'session'
    }

    # Relationship works for both child and parent sessions
    survey_responses = db.relationship('SurveyResponse', backref='session')

class ChildSession(Session):
    __tablename__ = 'child_session'
    id = db.Column(db.String(255), db.ForeignKey('session.id'), primary_key=True)
    # ... child-specific fields

    __mapper_args__ = {'polymorphic_identity': 'child'}

class ParentSession(Session):
    __tablename__ = 'parent_session'
    id = db.Column(db.String(255), db.ForeignKey('session.id'), primary_key=True)
    # ... parent-specific fields

    __mapper_args__ = {'polymorphic_identity': 'parent'}

    # Only parent sessions have slider responses
    slider_responses = db.relationship('SliderResponse', backref='parent_session')

class SurveyResponse(db.Model):
    session_id = db.Column(db.String(255), db.ForeignKey('session.id'))
    # Works for both ChildSession and ParentSession!

class SliderResponse(db.Model):
    parent_session_id = db.Column(db.String(255), db.ForeignKey('parent_session.id'))
    # Only links to parent sessions
```

### Frontend: Dexie.js Implementation

Dexie doesn't have built-in inheritance, so we simulate it with multiple tables:

```javascript
this.db.version(1).stores({
    // Base table with discriminator
    sessions: 'id, sessionType, enumeratorId, createdAt, familyId',

    // Separate detail tables
    childSessionDetails: 'id, familyId, childId, name, school, surveyStatus',
    parentSessionDetails: 'id, familyId, school, groupType, preEarnings1, preEarnings2, surveyStatus, sliderStatus',

    // Responses link to base session.id
    surveyResponses: 'id, sessionId, surveyId, questionId',
    sliderResponses: 'id, parentSessionId, scenarioNumber'
});

// Create with transaction to maintain consistency
async createChildSession(data) {
    const sessionId = generateUUID();
    await this.db.transaction('rw', this.db.sessions, this.db.childSessionDetails, async () => {
        await this.db.sessions.add({
            id: sessionId,
            sessionType: 'child',
            ...baseData
        });
        await this.db.childSessionDetails.add({
            id: sessionId,
            ...childData
        });
    });
}
```

### Key Advantages

1. **Clean separation**: Each session type has its own table with only relevant fields
2. **No nullable columns**: No need for child1_name/child2_name to be null in child sessions
3. **Type safety**: Can query `ChildSession.query.all()` or `ParentSession.query.all()`
4. **Shared relationships**: `session.survey_responses` works seamlessly for both types
5. **Database integrity**: Proper foreign key constraints via base `session.id`
6. **Easy queries**: `Session.query.get(id)` automatically returns correct subclass type
7. **Extensible**: Easy to add child-specific or parent-specific fields without affecting other type

### Implementation Steps

1. **Backend Models** - Create Session, ChildSession, ParentSession classes
2. **Frontend Database** - Add new Dexie schema with sessions + detail tables
3. **Create schools.json** - Replace sessions.json with school definitions
4. **Update UI** - Two buttons, two modals, school dropdown from schools.json
5. **Update Routes** - Handle polymorphic queries and serialization
6. **Update Coordinators** - Handle both session types in upload/aggregation logic