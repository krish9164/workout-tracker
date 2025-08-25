from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('height_cm', sa.Float(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    op.create_table('exercises',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('muscles', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('is_custom', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.create_index('ix_exercises_name', 'exercises', ['name'])

    op.create_table('workouts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.String(length=2000), nullable=True),
    )
    op.create_index('ix_workouts_user_date', 'workouts', ['user_id', 'date'])

    op.create_table('sets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('workout_id', sa.Integer(), sa.ForeignKey('workouts.id'), nullable=False),
        sa.Column('exercise_id', sa.Integer(), sa.ForeignKey('exercises.id'), nullable=False),
        sa.Column('set_index', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('reps', sa.Integer(), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('rpe', sa.Float(), nullable=True),
        sa.Column('duration_s', sa.Float(), nullable=True),
        sa.Column('distance_m', sa.Float(), nullable=True),
        sa.Column('notes', sa.String(length=1000), nullable=True),
    )
    op.create_index('ix_sets_workout', 'sets', ['workout_id'])
    op.create_index('ix_sets_exercise', 'sets', ['exercise_id'])

def downgrade():
    op.drop_table('sets')
    op.drop_table('workouts')
    op.drop_table('exercises')
    op.drop_table('users')
