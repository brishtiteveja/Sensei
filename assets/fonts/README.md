# Vendored handwriting fonts

Used by `scripts/render_samples.py` to fake student handwriting in `samples/`.
Vendored rather than downloaded at render time: the demo box runs offline, and a sample
kit that needs the network to rebuild is not a sample kit.

| Font | Licence | Why this one |
|---|---|---|
| Patrick Hand | SIL OFL 1.1 | neat print hand, clearest digits of everything tested |
| Caveat | SIL OFL 1.1 | slanted and natural, visibly a different student |
| Coming Soon | Apache 2.0 | rounded marker hand, third distinct style |

Rejected: Kalam, Architects Daughter, Nanum Pen Script, Schoolbell, and macOS Noteworthy.
All of them draw `1` as a bare vertical stroke, so `11` reads as `||` and `10` as `|0`.
A sample the model provably cannot read is not a test of the tutor.
