from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT


SOURCE = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_updated.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_open_source.docx")

CONTRIBUTIONS = [
    (
        "Apache Magpie PR #1379",
        "https://github.com/apache/magpie/pull/1379",
        ": Reduced the optimize-skill context footprint from 3,995 to 3,038 tokens while preserving seven optimization passes and safety gates; added two behavioral eval fixtures and kept the full suite at 7/7.",
    ),
    (
        "Kestra PR #19805",
        "https://github.com/kestra-io/kestra/pull/19805",
        ": Replaced 55 explicit any usages across 10 TypeScript and Vue store files with SDK, domain, and narrowed unknown types; passed application, design-system, and test type checks, lint, and 109 focused unit tests.",
    ),
]


def paragraph_by_text(document: Document, text: str):
    matches = [paragraph for paragraph in document.paragraphs if paragraph.text == text]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph matching {text!r}; found {len(matches)}")
    return matches[0]


def set_text_node(paragraph_xml, index: int, value: str) -> None:
    text_nodes = paragraph_xml.xpath(".//w:t")
    if index >= len(text_nodes):
        raise RuntimeError(f"Paragraph has only {len(text_nodes)} text nodes")
    text_nodes[index].text = value


def clone_title(source_paragraph, title: str, date: str):
    paragraph_xml = deepcopy(source_paragraph._p)
    set_text_node(paragraph_xml, 0, title)
    set_text_node(paragraph_xml, 1, f"\t{date}")
    return paragraph_xml


def make_linked_bullet(document: Document, source_paragraph, label: str, url: str, remainder: str):
    source_xml = source_paragraph._p
    paragraph_xml = OxmlElement("w:p")
    if source_xml.pPr is not None:
        paragraph_xml.append(deepcopy(source_xml.pPr))

    source_run = source_xml.find(qn("w:r"))
    if source_run is None:
        raise RuntimeError("Source bullet paragraph has no run")

    relationship_id = document.part.relate_to(url, RT.HYPERLINK, is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), relationship_id)
    hyperlink.set(qn("w:history"), "1")

    linked_run = deepcopy(source_run)
    linked_text = linked_run.find(qn("w:t"))
    linked_text.text = label
    run_properties = linked_run.find(qn("w:rPr"))
    if run_properties is None:
        run_properties = OxmlElement("w:rPr")
        linked_run.insert(0, run_properties)
    color = run_properties.find(qn("w:color"))
    if color is None:
        color = OxmlElement("w:color")
        run_properties.append(color)
    color.set(qn("w:val"), "1155CC")
    underline = run_properties.find(qn("w:u"))
    if underline is None:
        underline = OxmlElement("w:u")
        run_properties.append(underline)
    underline.set(qn("w:val"), "single")
    hyperlink.append(linked_run)
    paragraph_xml.append(hyperlink)

    body_run = deepcopy(source_run)
    body_text = body_run.find(qn("w:t"))
    body_text.text = remainder
    body_text.set(qn("xml:space"), "preserve")
    paragraph_xml.append(body_run)
    return paragraph_xml


def main() -> None:
    document = Document(SOURCE)
    reach_title = paragraph_by_text(
        document,
        "Software Engineering Intern, Reach Inc.\tJun 2025 to Jul 2025",
    )
    reach_last_bullet = paragraph_by_text(
        document,
        "Worked closely with the engineering team through architecture discussions, implementation, testing, and release, and picked up the team's review and deployment habits within the first couple of weeks.",
    )
    reach_second_bullet = paragraph_by_text(
        document,
        "Extended core site functionality through server side integrations that matched the team's existing REST API conventions and code review standards.",
    )
    bullet_template = paragraph_by_text(
        document,
        "Shipped backend logic and REST API endpoints in Node.js and Express.js for new product features, taking each one from an initial spec through to production without needing much handholding.",
    )

    reach_last_bullet._p.getparent().remove(reach_last_bullet._p)
    anchor = reach_second_bullet._p
    title_xml = clone_title(reach_title, "Open Source Contributions, GitHub", "Sep 2026")
    anchor.addnext(title_xml)
    anchor = title_xml

    for label, url, remainder in CONTRIBUTIONS:
        bullet_xml = make_linked_bullet(document, bullet_template, label, url, remainder)
        anchor.addnext(bullet_xml)
        anchor = bullet_xml

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
