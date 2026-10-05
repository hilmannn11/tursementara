(() => {
  function spokenText(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('[data-narration-ui], .sr-only, [hidden], [aria-hidden="true"], .glossary-tooltip, script, style, svg').forEach((node) => node.remove());
    // Glossary buttons contain a term that belongs to the sentence.
    copy.querySelectorAll('button:not(.glossary-term), input, select, textarea').forEach((node) => node.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

  function speechText(text) {
    return text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\b\d+(?:[/.]\d+)*(?:\/KEP)?(?:\/[\d.]+)+\b/gi, (number) => number.replace(/\//g, ", ").replace(/KEP/gi, "Keputusan").replace(/\./g, " titik "))
      .replace(/\bSK\b/g, "Surat Keputusan")
      .replace(/\b3D\b/g, "tiga dimensi")
      .replace(/\bhlm\./gi, "halaman")
      .replace(/&/g, " dan ")
      .replace(/\s+/g, " ").trim();
  }

  function chunks(text) {
    const output = [];
    const normalized = speechText(text);
    const sentences = typeof Intl.Segmenter === "function"
      ? [...new Intl.Segmenter("id", { granularity: "sentence" }).segment(normalized)].map(({ segment }) => segment.trim())
      : normalized.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ0-9])/u);
    let paragraph = "";
    for (const sentence of sentences) {
      if (paragraph && paragraph.length + sentence.length > 550) {
        output.push(paragraph);
        paragraph = "";
      }
      // Preserve complete sentences so the voice can keep its natural intonation.
      // Only exceptionally long sentences need a break, preferably at a clause.
      let remaining = sentence;
      while (remaining.length > 800) {
        if (paragraph) { output.push(paragraph); paragraph = ""; }
        const sample = remaining.slice(0, 801);
        const clause = Math.max(sample.lastIndexOf(", "), sample.lastIndexOf("; "), sample.lastIndexOf(": "));
        const split = clause >= 300 ? clause + 1 : sample.lastIndexOf(" ");
        const end = split > 0 ? split : 800;
        output.push(remaining.slice(0, end).trim());
        remaining = remaining.slice(end).trim();
      }
      paragraph = [paragraph, remaining].filter(Boolean).join(" ");
    }
    if (paragraph) output.push(paragraph);
    return output;
  }

  function collect(record) {
    const nodes = record.selector ? [...record.root.querySelectorAll(record.selector)] : [record.root];
    const blocks = nodes
      .filter((node) => !node.closest('[data-narration-ui], .stone-inline-source, .stone-quiz-invitation, .glossary-tooltip') && !node.matches('.eyebrow, .stone-model-caption, .plaque-photo-caption'))
      .map((element) => ({ element, text: spokenText(element) }))
      .filter((block) => block.text);
    if (record.glossary) {
      record.root.querySelectorAll('.glossary-term[aria-describedby]').forEach((term) => {
        const definition = document.getElementById(term.getAttribute('aria-describedby'));
        if (definition) blocks.push({ element: term.closest('p'), text: `Istilah ${term.textContent.trim()}. ${spokenText(definition)}` });
      });
    }
    return blocks.flatMap((block) => chunks(/[.!?…:]$/.test(block.text) ? block.text : `${block.text}.`).map((text) => ({ text, element: block.element })));
  }

  function passageKey(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  window.LitheraNarrationContent = Object.freeze({ collect, chunks, speechText, passageKey });
})();
