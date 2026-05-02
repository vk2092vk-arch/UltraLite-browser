#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  UltraLite browser (Android, build #17 on GitHub). Below 64 kbps the
  UltraLite mode fails to open pages. Convert UltraLite from "Modern-Lite"
  to "Pure Legacy" (Opera Mini 4.0 / 2010 era) via:
    1. URL redirection to legacy endpoints (mbasic.facebook.com,
       instagram /accounts/login/?force_classic=1, mobile.twitter.com,
       m.youtube.com, en.m.wikipedia.org, old.reddit.com, gbv=1 Google).
    2. Extreme data stripping — primary engine cleans HTML on the device
       (scripts/styles/iframes/svg/video/audio/objects/picture/comments
       removed; ads/cookie/sidebar/footer junk dropped); r.jina.ai is
       fallback only.
    3. 2 KB Pure-Legacy CSS template injected — white bg, black text,
       blue links, native forms/buttons/inputs preserved.
    4. Image placeholders (X-box) so layout doesn't collapse.
  No raw markdown. NO webpreview / NO EAS build / NO testing agents (user
  explicitly forbade). Goal: APK pushed to GitHub via Save-to-GitHub →
  GitHub Actions.

frontend:
  - task: "Pure Legacy URL mapping (legacyMap.ts)"
    implemented: true
    working: "NA"
    file: "frontend/src/utils/legacyMap.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New file. mapToLegacy() rewrites popular hosts to lite endpoints (mbasic.fb, m.yt, m.wiki, mobile.twitter, old.reddit, gbv=1 Google, force_classic Instagram). isTrustedLite() flags hosts that should bypass the HTML cleaner and load directly in URI mode (mbasic.fb, m.yt, m.wiki, lite.ddg, old.reddit, m.twitter)."

  - task: "Pure Legacy HTML cleaner (ultraliteFetch.ts rewrite)"
    implemented: true
    working: "NA"
    file: "frontend/src/utils/ultraliteFetch.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Full rewrite. Markdown mode REMOVED. Direct fetch first (8 s) with mobile UA → r.jina.ai HTML fallback (25 s, X-Return-Format=html) → graceful error page. Regex-based HTML cleaner: strips script/style/link/iframe/svg/canvas/video/audio/object/picture/embed/source/track/meta/comments; drops ad/cookie/popup/sidebar/footer/social containers via class/id token regex; replaces <img> with X-box placeholder preserving alt; whitelists only safe attrs (href/src/action/method/name/value/type/placeholder/checked/selected/disabled/target/alt/title/for/colspan/rowspan/maxlength/min/max/step/pattern/required/readonly/autocomplete/multiple/rows/cols/wrap/enctype/accept) — strips style/class/id/on*/data-*; resolves relative URLs against base; blocks javascript: schemes. Injects ~2 KB inline CSS (white bg, blue links, black text, native form styling)."

  - task: "Lite DuckDuckGo search in UltraLite (url.ts)"
    implemented: true
    working: "NA"
    file: "frontend/src/utils/url.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "UltraLite mode now points searches to https://lite.duckduckgo.com/lite/?kp=-2 (no-JS, ~10 KB endpoint) instead of the JS-heavy main DDG page. Normal mode unchanged."

  - task: "home.tsx Pure-Legacy routing"
    implemented: true
    working: "NA"
    file: "frontend/app/home.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "openUrl() now applies mapToLegacy() in UltraLite. Three branches: (a) Normal mode OR login URL OR trusted-lite host → URI WebView (JS on, native forms/cookies); (b) UltraLite + arbitrary host → fetchCleanHtml HTML mode (JS off in WebView). onShouldStartLoadWithRequest also re-routes cross-host clicks in URI mode through openUrl so search-result clicks get legacy-mapped + cleaned. Loading stub now uses the same Pure-Legacy white/sans-serif style. Mode label updated to 'UltraLite (Pure Legacy · 64 kbps)'."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Implemented Pure Legacy mode for UltraLite per user spec. Touched 4
        files (1 new + 3 edits). NO automated testing performed — user
        explicitly forbade webpreview / EAS / testing agents. Code compiles
        clean (verified via `tsc --noEmit`; only pre-existing AdBanner
        platform-resolution warnings remain — unrelated to these changes).
        User will save-to-GitHub which triggers GitHub Actions APK build.
