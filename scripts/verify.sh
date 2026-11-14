#!/usr/bin/env bash
# One command for a person, an agent and CI. Default: the quick checks plus the unit tests related to what
# changed since main; --full: every check, as CI runs it. Exit 1 names what failed; each log is under .verify/.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p .verify && : >.verify/timings

failed=()
run() {                       # run <name> <command> [args...]
  local name=$1 start=$SECONDS log=".verify/$1.log"; shift
  printf '== %s\n' "$name"
  if "$@" >"$log" 2>&1; then
    printf '   ok\n'
  else
    printf '   FAILED: see %s\n' "$log"
    tail -n 40 "$log"
    failed+=("$name")
  fi
  printf '%s\t%ss\n' "$name" "$((SECONDS - start))" >>.verify/timings
}

# A changed path matching this, or a deleted one, reaches code that no related unit test names:
# the gate itself, CI, manifests and lockfile, build and test config, the page shell, and the data schema.
widens='^(scripts/|\.github/|package\.json|package-lock\.json|tsconfig\.json|vite\.config\.ts|playwright\.config\.ts|index\.html|src/model/show\.ts)'
full=0 changed=(); [ "${1:-}" = "--full" ] && full=1
[ "$full" = 0 ] && while IFS= read -r path; do
  if [ ! -e "$path" ] || [[ $path =~ $widens ]]; then echo "verify: $path widens the change"; full=1; break; fi
  changed+=("$path")
done < <({ git diff --name-only "${VERIFY_BASE:-$(git merge-base HEAD main)}" --; git ls-files --others --exclude-standard; } | sort -u)

run types npx tsc -b
run boundaries node scripts/static-metrics.mjs --check
if [ "$full" = 1 ]; then
  run unit npx vitest run
  run build npm run build
  # Builds and serves on 127.0.0.1:4173 with the system Chrome; a sandbox that forbids opening ports fails here.
  run e2e npx playwright test --grep-invert measure
elif [ "${#changed[@]}" -gt 0 ]; then
  run related npx vitest related --run --passWithNoTests "${changed[@]}"
fi

summary="verify: ok"; [ "${#failed[@]}" -gt 0 ] && summary="verify: FAILED: ${failed[*]}"
[ "$full" = 1 ] && [ -z "$(git status --porcelain)" ] && echo "$summary" >".verify/baseline-$(git rev-parse HEAD)"
# #TODO(agent): DEFERRED — adopting a linter/formatter or a secret scanner adds a dependency: a person decides.
echo "not covered: lint and formatting (no tool in this repo), secret scanning, Safari and Firefox (e2e runs Chrome only)"
[ "$full" = 0 ] && echo "not run: unit, build and e2e (run with --full before a pull request, and after any UI change)"
echo "$summary"
[ "${#failed[@]}" -eq 0 ]
