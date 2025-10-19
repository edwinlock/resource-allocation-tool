from flask_wtf import FlaskForm
from wtforms import SubmitField
from wtforms.fields import SelectMultipleField
from wtforms.widgets import CheckboxInput, ListWidget


class EditUserRolesForm(FlaskForm):
    """Form for editing user roles (administrator only)."""
    roles = SelectMultipleField(
        'Roles',
        choices=[
            ('enumerator', 'Enumerator'),
            ('supervisor', 'Supervisor'),
            ('administrator', 'Administrator')
        ],
        widget=ListWidget(prefix_label=False),
        option_widget=CheckboxInput()
    )
    submit = SubmitField('Update Roles')