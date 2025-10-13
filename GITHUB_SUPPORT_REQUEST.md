# GitHub Support Request - Purge Cached Commit

## Email Template for GitHub Support

**To**: support@github.com  
**Subject**: URGENT: Request to purge orphaned commit containing sensitive credentials

---

**Email Body**:

```
Hello GitHub Support,

I am requesting urgent assistance to permanently remove an orphaned commit 
from my repository that contains sensitive credentials.

REPOSITORY DETAILS:
- Repository: https://github.com/cossil/LexiAid
- Owner: cossil
- Commit SHA: fdb6c39ff1e3d512bead6defa77f119bb9a10e19
- File containing sensitive data: .env

SITUATION:
On October 12, 2025, I discovered that my .env file containing API keys and 
service account credentials was accidentally committed to the repository.

ACTIONS TAKEN:
1. Used git-filter-repo to remove the file from entire Git history
2. Force pushed to rewrite repository history
3. Revoked and regenerated all exposed credentials
4. The commit no longer exists in any branch

CURRENT PROBLEM:
The commit is still accessible at:
https://github.com/cossil/LexiAid/commit/fdb6c39ff1e3d512bead6defa77f119bb9a10e19

GitHub shows: "This commit does not belong to any branch on this repository, 
and may belong to a fork outside of the repository."

The commit is orphaned but still cached and publicly accessible, exposing:
- Firebase API keys
- Google Cloud service account credentials
- Backend API keys
- Database credentials

CREDENTIALS STATUS:
All exposed credentials have been revoked and regenerated. However, the 
commit remains accessible, which triggered a security alert from Google 
Cloud Platform.

REQUEST:
Please permanently purge commit fdb6c39ff1e3d512bead6defa77f119bb9a10e19 
from GitHub's cache and make it completely inaccessible.

URGENCY:
This is a security incident. The exposed credentials have been rotated, 
but the commit should be removed as soon as possible.

Thank you for your assistance.

Best regards,
[Your Name]
Repository: cossil/LexiAid
```

---

## Alternative: Use GitHub's Sensitive Data Removal Form

**URL**: https://support.github.com/contact/sensitive-data

**Form Fields**:

1. **Your email**: [Your GitHub email]

2. **Repository URL**: 
   ```
   https://github.com/cossil/LexiAid
   ```

3. **Commit SHA(s)**:
   ```
   fdb6c39ff1e3d512bead6defa77f119bb9a10e19
   ```

4. **File path(s)**:
   ```
   .env
   ```

5. **Description**:
   ```
   This commit contains a .env file with sensitive credentials including:
   - Firebase API keys
   - Google Cloud service account credentials
   - Backend API keys
   - Database credentials
   
   The commit was removed from repository history using git-filter-repo 
   and force push, but remains cached and accessible. All credentials 
   have been revoked and regenerated.
   
   Google Cloud Platform detected this commit and sent a security alert.
   
   Please permanently purge this orphaned commit from GitHub's cache.
   ```

6. **Have you revoked the credentials?**: Yes

7. **Additional information**:
   ```
   - Commit removed from history on: October 12, 2025
   - All credentials revoked: October 12, 2025
   - GCP security alert received: October 13, 2025
   - Commit is orphaned but still accessible
   ```

---

## Expected Response Time

- **Standard**: 24-48 hours
- **Urgent**: Request expedited handling in your message

---

## What GitHub Will Do

1. Verify your ownership of the repository
2. Confirm the commit is orphaned
3. Permanently purge the commit from their cache
4. Purge from GitHub's CDN and backup systems
5. Confirm removal via email

---

## After GitHub Purges the Commit

1. Verify commit returns 404:
   ```
   https://github.com/cossil/LexiAid/commit/fdb6c39ff1e3d512bead6defa77f119bb9a10e19
   ```

2. Acknowledge Google Cloud security alert

3. Document incident resolution

---

## Important Notes

- **Do not delete the repository** - this won't help and will cause more issues
- **Keep credentials revoked** - even after commit is purged
- **GitHub may take 24-48 hours** - be patient
- **The commit will eventually be purged** - GitHub takes security seriously

---

## Tracking

**Request sent**: [Date/Time]  
**GitHub ticket**: [Ticket number when received]  
**Status**: Pending  
**Expected resolution**: Within 48 hours  
**Actual resolution**: [Date/Time when confirmed]
