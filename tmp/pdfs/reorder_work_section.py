from pathlib import Path

from docx import Document


SOURCE = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_open_source.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_work.docx")


def paragraph_by_text(document: Document, text: str):
    matches = [paragraph for paragraph in document.paragraphs if paragraph.text == text]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph matching {text!r}; found {len(matches)}")
    return matches[0]


def main() -> None:
    document = Document(SOURCE)

    section_heading = paragraph_by_text(document, "Experience")
    heading_text_nodes = section_heading._p.xpath(".//w:t")
    if len(heading_text_nodes) != 1:
        raise RuntimeError("Unexpected Work section heading structure")
    heading_text_nodes[0].text = "Work"

    reach_title = paragraph_by_text(
        document,
        "Software Engineering Intern, Reach Inc.\tJun 2025 to Jul 2025",
    )
    open_source_title = paragraph_by_text(
        document,
        "Open Source Contributions, GitHub\tSep 2026",
    )
    magpie_bullet = paragraph_by_text(
        document,
        "Apache Magpie PR #1379: Reduced the optimize-skill context footprint from 3,995 to 3,038 tokens while preserving seven optimization passes and safety gates; added two behavioral eval fixtures and kept the full suite at 7/7.",
    )
    kestra_bullet = paragraph_by_text(
        document,
        "Kestra PR #19805: Replaced 55 explicit any usages across 10 TypeScript and Vue store files with SDK, domain, and narrowed unknown types; passed application, design-system, and test type checks, lint, and 109 focused unit tests.",
    )

    parent = reach_title._p.getparent()
    nodes = [open_source_title._p, magpie_bullet._p, kestra_bullet._p]
    for node in nodes:
        parent.remove(node)

    insertion_index = parent.index(reach_title._p)
    for offset, node in enumerate(nodes):
        parent.insert(insertion_index + offset, node)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
