# Placement: where a thing goes, before how it looks

Decide this before drawing anything. Most UI rework comes from putting a thing in the wrong place
(its own page, a window over a window, a tab nobody visits), not from how it looks. Every rule
below came from a correction Shreyansh had to make; each is cheaper to get right first.

Answer each question for the change in hand. "Yes" to any of the warnings means move the thing.

## The questions

1. **Where is this used?** Put it there. A list that is only ever picked from one form (leave
   types, purposes, deal sources) is created and edited where it is picked or on the page that
   uses it, not on a page of its own.
2. **Whose is it?** A record owns its parts and shows them inside itself: a company's locations
   and money accounts in the company's window, an employee's salary and bank details in the
   employee's window, from the moment the record is created. Never "save it, then go to another
   page to finish it".
3. **Am I adding a layer?** A new page, window, tab, or a button that only opens something else
   has to justify itself against an existing screen that could hold it. Default: put it on the
   screen that already exists, as a section or a column.
4. **Am I stacking windows?** Never open a window over a window. A second level (adding an account
   inside a company, editing a role from the roles list) replaces the first in place, with Back,
   inside the same window.
5. **Is this daily work or setup?** Daily work (attendance, today's figures) lives where the day
   starts, the dashboard or the module's main page, never hidden under Setup. Setup holds what is
   set once.
6. **Is it editable in one place only?** One home per setting. A second place to edit the same
   thing must be a link to the first, not a copy.
7. **Is the control where the eye already is?** A "New" button sits beside the list's search, not
   alone above it; Save sits at the end of the form being saved.
8. **Is space earning its keep?** An empty stretch of column or page is a place to show what
   people want next (bank, account number, current balance), not padding.
9. **Does the text fit?** A description is one line. A tab or label is a word or two that says what
   it holds ("Books", not "Settings"; "Leave & pay", not two tabs).
10. **Is it a multi-part create?** Creating a record with several tabs walks them as numbered steps
    (Back, Next, then Save); editing keeps plain tabs.

## When asked to move or merge something

Merge, nest or inline is usually the right answer. Before adding a new home for anything, name the
existing screen it could live on and why it cannot. If you cannot say why in one sentence, put it
there.

## Warning signs in your own plan

- "It gets its own page" for fewer than ten rows of reference data
- "Opens a window" from inside a window
- "A button that opens …" where the content could simply be shown
- "Save first, then …" on a create flow
- A tab whose content is one short list
- The same field editable from two screens
