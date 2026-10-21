# Numbers, units, cones and dates

`get_my_settings` gives the person's weight unit, temperature scale, cones and language. Use them to read back,
not to change what they said.

## Recipe amounts

- Keep the unit spoken: grams, pounds, parts or percent. All the lines of a recipe share one unit. Mixed units
  ("40 grams... 2 ounces"): ask. Never convert quietly.
- Read back whether the amounts add up to 100. If they do, say "saved as parts of 100"; if not, "saved as
  given".
- "A pinch", "a spoonful", "a bit more" are not amounts: ask.

## Spoken numbers

- "Forty and a half" is 40.5. Read every number back as digits.
- Speech-to-text confuses fifteen and fifty, sixteen and sixty, thirteen and thirty. When a transcript is all
  you have, mark such a number: "(15 or 50?)".
- A decimal comma, for languages that write one: "12,5" is 12.5. In a recipe a comma is never a thousands
  separator.

## Material names

Speech-to-text mangles them: EPK, Custer, Gerstley, Ferro frit 3134, 3124 or 3195, wollastonite, nepheline
syenite. Check every name with `search_materials` before the read-back. With no exact match, ask: "I heard
'custard spar': Custer Feldspar?" Never choose between two frits yourself.

## Temperatures

- Keep the scale spoken, in the matching column: Temperature F or Temperature C.
- When it differs from the person's setting, say so in the read-back, but do not convert unless they ask
  (`convert_cone_temperature`).

## Cones

- Keep the cone as said: Orton "cone 6", "SK 6", or a temperature.
- "Cone 06" and "cone 6" are far apart: always read back which ("cone oh-six, low fire?").
- A recipe's firing band only when the cone is clear.

## Dates and times

- Work out "today", "yesterday" or "last night" as a date, and read the date back.
- Firing-log times as said: clock times ("9:40") or time since the start ("2:15"). One style in a log.

## Language

Talk in the person's language. Saved notes and results keep their words, in their language.
