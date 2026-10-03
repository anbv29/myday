from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT


SOURCE = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_current.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_with_owasp.docx")
LABEL = "OWASP cve-lite-cli PR #1240"
URL = "https://github.com/OWASP/cve-lite-cli/pull/1240"
REMAINDER = (
    ": Fixed OA008 semver diagnostics to distinguish below-range, above-range, and union-gap "
    "mismatches; added regression coverage and passed lint, build, and focused tests."
)


def paragraph_by_prefix(document: Document, prefix: str):
    matches = [paragraph for paragraph in document.paragraphs if paragraph.text.startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph starting with {prefix!r}; found {len(matches)}")
    return matches[0]


def linked_bullet(document: Document, template_paragraph):
    source_xml = template_paragraph._p
    paragraph_xml = OxmlElement("w:p")
    if source_xml.pPr is not None:
        paragraph_xml.append(deepcopy(source_xml.pPr))

    source_run = source_xml.find(qn("w:r"))
    if source_run is None:
        source_run = source_xml.find(".//" + qn("w:r"))
    if source_run is None:
        raise RuntimeError("Bullet template has no run")

    relationship_id = document.part.relate_to(URL, RT.HYPERLINK, is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), relationship_id)
    hyperlink.set(qn("w:history"), "1")

    link_run = deepcopy(source_run)
    link_text = link_run.find(qn("w:t"))
    if link_text is None:
        raise RuntimeError("Bullet template run has no text node")
    link_text.text = LABEL
    run_properties = link_run.find(qn("w:rPr"))
    if run_properties is None:
        run_properties = OxmlElement("w:rPr")
        link_run.insert(0, run_properties)
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
    hyperlink.append(link_run)
    paragraph_xml.append(hyperlink)

    body_run = deepcopy(source_run)
    body_text = body_run.find(qn("w:t"))
    if body_text is None:
        raise RuntimeError("Bullet template run has no text node")
    body_text.text = REMAINDER
    body_text.set(qn("xml:space"), "preserve")
    paragraph_xml.append(body_run)
    return paragraph_xml


def main() -> None:
    document = Document(SOURCE)
    kestra = paragraph_by_prefix(document, "Kestra PR #19805:")
    bullet_xml = linked_bullet(document, kestra)
    kestra._p.addnext(bullet_xml)

    internship_first = paragraph_by_prefix(
        document,
        "Shipped backend logic and REST API endpoints",
    )
    internship_second = paragraph_by_prefix(
        document,
        "Extended core site functionality",
    )
    text_nodes = internship_first._p.xpath(".//w:t")
    if len(text_nodes) != 1:
        raise RuntimeError(f"Unexpected internship bullet structure with {len(text_nodes)} text nodes")
    text_nodes[0].text = (
        "Shipped Node.js and Express.js REST endpoints and server-side integrations from "
        "specification through production, following the team's API conventions and code review standards."
    )
    internship_second._p.getparent().remove(internship_second._p)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
