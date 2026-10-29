## What

<!-- What the PR changes. -->

## Why

<!-- The problem, and the issue or ticket link. -->

## Tier

<!-- T0, T1, T2 or T3: the row of the REVIEW.md matrix that sets it, and the evidence. -->

## Integrator impact

<!-- What an integrating app sees or must do. "None" when apps see no difference. -->

## Mitigation after release

<!-- Backend flag (REVIEW.md rule 5), hotfix release or workaround. "Not needed" for T0. -->

## How to verify

<!-- The commands, tests or sample app steps that prove the change. -->

## Notes

<!-- Anything else the reviewer must know. -->

## Checklist

- [ ] The `tier:T<n>` label of the **Tier** section.
- [ ] A new JS method has both native handlers (iOS and Android), a Jest test, and the native tests where they exist.
- [ ] A changed native pin: all native pins have the same version (`plugin.xml`, `Package.swift`, `purchasely-google/plugin.xml`, `android-tests/build.gradle`, `Package.resolved`), and `VERSIONS.md` has the row.
- [ ] The branch is rebased on `origin/main`, the `run-ci` label was added after the last push, and CI is green on the head commit.
- [ ] Conventional Commits, small and atomic.
