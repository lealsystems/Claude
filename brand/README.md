# SA Construction — brand assets

Round 01 logo files. Three competing marks plus a shared wordmark, all true vector.
Nothing here is final: pick a direction and the rest gets deleted.

## Files

| File | What it is |
| --- | --- |
| `mark-truss.svg` | Direction 01 — hollow triangle crossed by a tie beam |
| `mark-plumb.svg` | Direction 02 — plumb bob meeting its datum line |
| `mark-plate.svg` | Direction 03 — initials cut from a steel plate |
| `wordmark-sa.svg` | The SA letterforms on their own |
| `lockup-horizontal.svg` | Mark left, name right — default for headers and letterheads |
| `lockup-stacked.svg` | Mark above name — for square spaces, signage, social avatars |
| `mark-*-mono.svg` | One-colour versions, inheriting `currentColor` |
| `favicon.svg` | Truss mark bled to the edges so it survives 16px |
| `contact-sheet.html` | Open in a browser to see every file at once, including the dark-ground and 24px tests |

## Colour

| Name | Hex | Use |
| --- | --- | --- |
| Survey orange | `#DB4F16` | The single accent. One per lockup, never two |
| Bitumen | `#191A18` | Marks, headings, body copy |
| Galvanised | `#6E6F69` | Secondary text, rules |
| Concrete | `#E9E8E3` | Page ground |
| Chalk | `#F7F6F3` | Cards, panels |

On dark grounds, swap Bitumen for Concrete and lift the orange to `#F26522` — at low
lightness the darker orange muddies.

## Two things to know before this goes to a printer

**The letterforms are geometry, not type.** `wordmark-sa.svg` draws S and A as stroked
paths, so there is no font to embed and no substitution risk. It renders identically
everywhere. Every corner is chamfered rather than square — that is load-bearing, not
decorative: with square corners the S reads as a 5. The A takes a flat top to match.

**"CONSTRUCTION" is still live text.** Both lockups set that word with a system font
stack, which means it will shift slightly between machines. That is fine for review and
for the web, but before anything is printed, embroidered or cut, we need to choose a
licensed typeface and convert that word to outlines. Flagging it now so it does not
surprise anyone at the sign shop.

## Minimum sizes

Truss and plate hold down to 16px. Plumb wants 20px — below that the line above the bob
closes up. For embroidery, nothing under 25mm wide.

## Clear space

Keep free space around every lockup equal to the height of the tie beam in the mark.
