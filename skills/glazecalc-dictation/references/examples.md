# Worked examples

Short sessions showing the read-back, a correction and a refusal. "You" is the assistant.

## 1. A recipe, with a mangled name

> **Potter:** New recipe, Floating blue. Custard spar 40, silica 30, whiting 20, EPK 10, plus cobalt one and
> a half percent.

You check the names with `search_materials`: "custard spar" has no exact match; Custer Feldspar is near.

> **You:** Here is the recipe:
>
> - Floating blue. Custer Feldspar 40 (I heard "custard spar": Custer Feldspar?), Silica 30, Whiting 20,
>   EPK Kaolin 10. Adds up to 100.
> - Colorant: Cobalt Carbonate 1.5 percent (you said cobalt: carbonate, or oxide?).
> - No firing given: I'll leave it out.
>
> Save it? (yes / change something / no)
>
> **Potter:** Carbonate. Yes.
>
> **You:** _(calls `create_recipe`)_ Saved "Floating blue". Its unity formula: ...

## 2. Mixed units

> **Potter:** Silica 400 grams, whiting a pound.
>
> **You:** Those are in two units, grams and a pound. A recipe keeps one unit, and I won't convert them on my
> own. Will you give me the whiting in grams, or should I convert the pound for you to check?

## 3. A note on a saved recipe

> **Potter:** Note on my Floating blue: runs on the lower third at cone 6.

You find it with `list_recipes`: one match.

> **You:** A note about your recipe "Floating blue" (cone 6): "Runs on the lower third at cone 6." Save it?
>
> **Potter:** Yes.
>
> **You:** _(calls `add_notebook_entry` with about)_ Saved, as a note about "Floating blue".

## 4. A live firing log, in bursts

> **Potter:** Glaze firing today, cone 6, the Skutt. 9:00, 1000 °F. 11:30, 2000.
>
> **You:** Firing log "Glaze firing, cone 6", 21 October, kiln Skutt. Columns Time, Temperature F, Cone.
>
> - 9:00, 1000 °F
> - 11:30, 2000 °F
>
> Save it now, or keep taking readings?
>
> **Potter:** Keep going. 2:40, 2150, cone 5 bending.
>
> **You:** 2:40, 2150 °F, Cone "5 bending". It has been a while: save the log now, so far?
>
> **Potter:** Yes.
>
> **You:** _(calls `create_firing_log`)_ Saved, with 3 readings. Later ones I'll add to it.

## 5. Test tile results, waiting for approval

> **Potter:** From Tuesday's firing: the whiting blend tile 3 is satin, no crazing.
>
> **You:** The result "Satin, no crazing." for your recipe "Whiting blend 3", in the firing log "Glaze firing,
> cone 6" of 20 October. Save it?
>
> **Potter:** Yes.
>
> **You:** _(calls `link_firing`; Glazecalc answers that the change waits)_ Not saved yet: your account asks
> to approve changes. Approve it at the link Glazecalc gave: https://glazecalcapp.com/confirm/... It is saved
> when you approve it there.

## 6. "Save it" before a read-back, and a token that can only read

> **Potter:** Silica 30, whiting 20, save it.
>
> **You:** Before I save: this has no name, and only two materials. What is it called, and is that the whole
> recipe?

Later, with a token that can only read:

> **You:** _(calls `create_recipe`; Glazecalc refuses)_ Nothing was saved: this connection can only read your
> records. To let me save, make a token that can "Read and change" on your Glazecalc account page, or connect
> again and tick "Also let it change my records". I'll keep your notes here until then.
