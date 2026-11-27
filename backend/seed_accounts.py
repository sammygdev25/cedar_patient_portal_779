"""This app's sign-ins, one per role, set by start.sh when SEED_DEMO=1.

SEED_STEP=before (before the seed loads): makes the sign-up role's account at pk 1 when the database has no user
there, so the seed's links to it resolve. After the seed loads: each role's sign-in is the seeded person named for
the role (patient, patient@example.com), who owns that role's sample rows; a role with no seeded person gets a plain
account. Each gets its own password, SEED_<ROLE>_PASSWORD, read from the environment or from backend/.env, and a staff
role's sign-in is marked is_staff. Every other user but an admin gets an unusable password, so nobody can sign in as
them. An account whose password is not set cannot sign in. SEED_STEP=admin (a deploy, after the seed): the owner's
admin from ADMIN_EMAIL and ADMIN_PASSWORD, made once. No password is printed."""
import os
import re
from pathlib import Path

from django.contrib.auth import get_user_model

ROLE_FIELD = 'role'
# (role, sign-in name, staff), the sign-up role first
ACCOUNTS = [('patient', 'patient', False), ('doctor', 'doctor', True), ('receptionist', 'receptionist', True)]
KEY_RE = re.compile(r'^(SEED_[A-Z0-9_]+_PASSWORD)=(.*)$', re.M)


def passwords():
    """SEED_*_PASSWORD from backend/.env, then the environment on top (a deploy sets them as variables)."""
    found = {}
    env_file = Path('.env')
    if env_file.exists():
        for key, value in KEY_RE.findall(env_file.read_text(errors='replace')):
            found[key] = value.strip().strip('"').strip("'")
    for key, value in os.environ.items():
        if KEY_RE.match(key + '=') and value:
            found[key] = value
    return found


def role_key(role):
    return 'SEED_ROLE_DEMO_PASSWORD' if role.upper() == 'DEMO' else 'SEED_%s_PASSWORD' % role.upper()


def login_of(name):
    return name + '@example.com' if get_user_model().USERNAME_FIELD == 'email' else name


def fill(user, role, name, staff):
    """The account's name, email, role and staff mark, keeping what the seed already set."""
    User = get_user_model()
    if User.USERNAME_FIELD != 'username' and hasattr(user, 'username') and not user.username:
        user.username = name
    if User.USERNAME_FIELD != 'email' and hasattr(user, 'email') and not user.email:
        user.email = name + '@example.com'
    if ROLE_FIELD and hasattr(user, ROLE_FIELD):
        setattr(user, ROLE_FIELD, role)
    if staff:
        user.is_staff = True


def before_seed():
    """pk 1, the sign-up role's account, when no user holds it: the seed links its sample rows to pk 1."""
    User = get_user_model()
    if not ACCOUNTS or User.objects.filter(pk=1).exists():
        return
    role, name, staff = ACCOUNTS[0]
    user = User(**{User.USERNAME_FIELD: login_of(name)})
    if User.objects.exists():
        user.pk = 1
    fill(user, role, name, staff)
    user.set_unusable_password()
    user.save()
    print('sign-up account ready at pk %s' % user.pk)


def account(role, name, staff, password):
    """The role's sign-in by its name, made when the seed has no person for it, with this password or none."""
    User = get_user_model()
    login = login_of(name)
    user = User.objects.filter(**{User.USERNAME_FIELD: login}).first() or User(**{User.USERNAME_FIELD: login})
    fill(user, role, name, staff)
    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()
    user.save()
    return user


def admin():
    """The owner's admin account from ADMIN_EMAIL and ADMIN_PASSWORD, made once. An account that already has the
    email is never changed or promoted, and a password the app's rules refuse is not used. The email is the sign-in
    name. No password is printed."""
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError
    User = get_user_model()
    email = os.environ.get('ADMIN_EMAIL', '').strip().lower()
    password = os.environ.get('ADMIN_PASSWORD', '')
    if '@' not in email or not password:
        print('admin: ADMIN_EMAIL and ADMIN_PASSWORD are not both set; no admin made')
        return
    taken = User.objects.filter(**{User.USERNAME_FIELD: email})
    if hasattr(User, 'email'):
        taken = taken | User.objects.filter(email__iexact=email)
    if taken.exists():
        print('admin: an account with ADMIN_EMAIL already exists; left as it is')
        return
    user = User(**{User.USERNAME_FIELD: email})
    if User.USERNAME_FIELD != 'email' and hasattr(user, 'email'):
        user.email = email
    user.is_staff = True
    user.is_superuser = True
    try:
        validate_password(password, user)
    except ValidationError as exc:
        print('admin: ADMIN_PASSWORD fails %d of the password rules; no admin made' % len(exc.messages))
        return
    user.set_password(password)
    user.save()
    print('admin: made')


def main():
    User = get_user_model()
    found = passwords()
    kept, ready = [], []
    for role, name, staff in ACCOUNTS:
        try:
            user = account(role, name, staff, found.get(role_key(role), ''))
        except Exception as exc:
            print('sign-in %s not set up: %s' % (name, type(exc).__name__))
            continue
        kept.append(user.pk)
        if user.has_usable_password():
            ready.append(name)
    for user in User.objects.exclude(pk__in=kept).exclude(is_superuser=True):
        user.set_unusable_password()
        user.save(update_fields=['password'])
    print('sign-ins: ' + (', '.join(ready) if ready else 'none (no SEED_*_PASSWORD is set)'))


if os.environ.get('SEED_STEP') == 'before':
    before_seed()
elif os.environ.get('SEED_STEP') == 'admin':
    admin()
else:
    main()