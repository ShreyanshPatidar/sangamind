# Spinner verbs

The words Claude Code cycles through while it works ("Pondering…", "Wrangling…"). Written up
from a screenshot of `src/constants/spinnerVerbs.ts` and checked word for word against that file
in `D:\Coding\Apps\AI\claude-code`: 187 words. Original: [images/spinner-verbs.jpg](images/spinner-verbs.jpg).

## Changing them

Claude Code reads a `spinnerVerbs` setting (`~/.claude/settings.json`, or a project's
`.claude/settings.json`):

```json
{
  "spinnerVerbs": {
    "mode": "append",
    "verbs": ["Reconciling", "Tallying", "Balancing the books"]
  }
}
```

- `"append"` adds your words to the built-in list.
- `"replace"` uses only yours; an empty list falls back to the built-in one.

(From `getSpinnerVerbs()` in the same file, and the setting's schema in `utils/settings/types.ts`.)

## The built-in list

```
Accomplishing, Actioning, Actualizing, Architecting, Baking, Beaming, Beboppin', Befuddling,
Billowing, Blanching, Bloviating, Boogieing, Boondoggling, Booping, Bootstrapping, Brewing,
Bunning, Burrowing, Calculating, Canoodling, Caramelizing, Cascading, Catapulting, Cerebrating,
Channeling, Channelling, Choreographing, Churning, Clauding, Coalescing, Cogitating,
Combobulating, Composing, Computing, Concocting, Considering, Contemplating, Cooking, Crafting,
Creating, Crunching, Crystallizing, Cultivating, Deciphering, Deliberating, Determining,
Dilly-dallying, Discombobulating, Doing, Doodling, Drizzling, Ebbing, Effecting, Elucidating,
Embellishing, Enchanting, Envisioning, Evaporating, Fermenting, Fiddle-faddling, Finagling,
Flambéing, Flibbertigibbeting, Flowing, Flummoxing, Fluttering, Forging, Forming, Frolicking,
Frosting, Gallivanting, Galloping, Garnishing, Generating, Gesticulating, Germinating,
Gitifying, Grooving, Gusting, Harmonizing, Hashing, Hatching, Herding, Honking, Hullaballooing,
Hyperspacing, Ideating, Imagining, Improvising, Incubating, Inferring, Infusing, Ionizing,
Jitterbugging, Julienning, Kneading, Leavening, Levitating, Lollygagging, Manifesting,
Marinating, Meandering, Metamorphosing, Misting, Moonwalking, Moseying, Mulling, Mustering,
Musing, Nebulizing, Nesting, Newspapering, Noodling, Nucleating, Orbiting, Orchestrating,
Osmosing, Perambulating, Percolating, Perusing, Philosophising, Photosynthesizing, Pollinating,
Pondering, Pontificating, Pouncing, Precipitating, Prestidigitating, Processing, Proofing,
Propagating, Puttering, Puzzling, Quantumizing, Razzle-dazzling, Razzmatazzing,
Recombobulating, Reticulating, Roosting, Ruminating, Sautéing, Scampering, Schlepping,
Scurrying, Seasoning, Shenaniganing, Shimmying, Simmering, Skedaddling, Sketching, Slithering,
Smooshing, Sock-hopping, Spelunking, Spinning, Sprouting, Stewing, Sublimating, Swirling,
Swooping, Symbioting, Synthesizing, Tempering, Thinking, Thundering, Tinkering, Tomfoolering,
Topsy-turvying, Transfiguring, Transmuting, Twisting, Undulating, Unfurling, Unravelling,
Vibing, Waddling, Wandering, Warping, Whatchamacalliting, Whirlpooling, Whirring, Whisking,
Wibbling, Working, Wrangling, Zesting, Zigzagging
```
