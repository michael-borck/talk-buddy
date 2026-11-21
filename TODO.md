# Talk Buddy - Todo List

## Done

☑ Project concept — group Scenarios under a Project; Sessions inherit their
   project from their Scenario (ProjectsPage, ScenarioForm project picker,
   `/projects`, Scenarios `?project=` filter).
☑ Home page shows pinned items and recent conversations (Pinned section +
   Journal; project links).
☑ Search/filter in the sidebar for conversations and projects (NavRail ⌘K
   quick-search; Journal text search over scenario/pack/transcript).
☑ Trash system — soft delete with a 30-day retention window, restore, and
   empty-trash (TrashPage; `deleted_at` on scenarios/sessions/packs).
☑ Archive system — hide from main views with unarchive (ArchivePage).
☑ Project summary analysis — project-scoped insights (InsightsPage project
   selector: totals, activity, weekly trend, improvement).
☑ Favorites/pinning — pin Scenarios and Sessions to the top and to Home
   (`pinned` column; ScenarioCard/SessionCard toggles).
☑ Usage insights dashboard — totals, weekly chart, scenario activity, pace
   and filler trends (`insights.ts` + InsightsPage).
☑ Export — Scenarios, packs, packages, and a full data export exist
   (Scenarios/Data actions).

## Next

_All planned items are done. Add new ones here._