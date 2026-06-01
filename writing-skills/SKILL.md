---
name: social-platform-writing-patterns
description: Use when an AI agent must combine a user's persona, writing template, text, images, or content idea into platform-native drafts for Facebook, Instagram, Telegram, Threads, and X without copying the same caption or changing the campaign meaning.
metadata:
  short-description: Persona-led writing patterns for social platforms
---

# Social Platform Writing Patterns

Use this skill as the writing brain for social content. Persona controls voice. Template controls structure. Platform references control the final writing pattern.

## Core Rule

Create **platform-adapted siblings**:

- Keep the same persona, campaign intent, facts, offer, and CTA.
- Change the hook, length, paragraph shape, media emphasis, CTA wording, and format for each platform.
- Do not write one caption and lightly tweak it.
- Do not make each platform feel like a different campaign.

Write every platform draft from the same base campaign brief, not from another platform's caption.

## Load References

Load only the references for selected platforms:

- Facebook: `facebook.md`
- Instagram: `instagram.md`
- Telegram: `telegram.md`
- Threads: `threads.md`
- X: `x.md`

## Inputs

The user may provide persona first and content later. Treat persona as persistent context for the run.

Needed for drafting:

- Persona: voice, values, audience style, boundaries, words to use or avoid
- Writing template: hook style, sections, formatting rules, CTA style
- Source content: raw notes, blog idea, product info, images, links, or campaign instructions
- Target platforms

Ask only for missing information that materially changes the draft, such as CTA, target platforms, link, required image use, or sensitive/sponsored claims.

## Workflow

1. **Parse persona**
   - Extract tone, authority level, audience relationship, emotional style, boundaries, and taboo phrases.

2. **Parse template**
   - Identify the intended structure. If the template conflicts with a platform norm, preserve the template's intent but adapt the surface form.

3. **Parse source content**
   - Identify main message, audience value, proof, CTA, link, and image/media role.

4. **Create base campaign brief**
   - Use this as the shared source of truth:

```json
{
  "persona_summary": "",
  "template_summary": "",
  "campaign_goal": "",
  "audience": "",
  "main_message": "",
  "proof_or_context": [],
  "cta": "",
  "link": "",
  "media_role": "",
  "risk_flags": []
}
```

5. **Adapt per platform**
   - Load the relevant platform reference.
   - Apply its writing pattern.
   - Keep campaign invariants stable while changing platform variables.

6. **Validate**
   - Persona still sounds like the user.
   - Template intent is still visible.
   - Platform pattern fits the platform.
   - Same campaign meaning is preserved.
   - No new unverified facts were introduced.
   - CTA, media role, and length are appropriate.

## Output

Return concise platform sections:

```markdown
## Facebook
[draft]

## Instagram
[caption]
Hashtags: ...

## Telegram
[message]

## Threads
1. ...
2. ...

## X
1. ...
2. ...
```

For automation handoff, include the base brief and drafts:

```json
{
  "base_campaign_brief": {},
  "drafts": [
    {
      "platform": "instagram",
      "content": "",
      "writing_pattern_used": "",
      "validation": {
        "same_campaign": true,
        "persona_match": "high",
        "template_match": "high",
        "platform_fit": "high",
        "new_unverified_claims": false
      }
    }
  ]
}
```
