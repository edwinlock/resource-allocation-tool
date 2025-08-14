from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SelectField, SubmitField
from wtforms.validators import DataRequired, Length

class CreateSessionForm(FlaskForm):
    participant_number = StringField('Participant Number', validators=[
        DataRequired(), 
        Length(min=1, max=50)
    ])
    notes = TextAreaField('Initial Notes', validators=[Length(max=1000)])
    submit = SubmitField('Create Session')

class UpdateSessionForm(FlaskForm):
    session_status = SelectField('Status', choices=[
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], validators=[DataRequired()])
    notes = TextAreaField('Notes', validators=[Length(max=1000)])
    submit = SubmitField('Update Session')