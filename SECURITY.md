# Security

Please report a vulnerability privately, through GitHub's
[private vulnerability reporting](https://github.com/zohayrslileh/more-space/security/advisories/new),
rather than in a public issue.

Worth knowing about the design: the in-terminal command reaches its window through a Unix socket in a
per-instance temporary folder; only shells opened by that window are given its path.
