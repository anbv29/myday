from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT


SOURCE = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_with_owasp.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_current.docx")


def paragraph_by_prefix(document: Document, prefix: str):
    matches = [paragraph for paragraph in document.paragraphs if paragraph.text.startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph starting with {prefix!r}; found {len(matches)}")
    return matches[0]


def set_run_text(run_xml, text: str) -> None:
    text_node = run_xml.find(qn("w:t"))
    if text_node is None:
        raise RuntimeError("Template run has no text node")
    text_node.text = text
    text_node.set(qn("xml:space"), "preserve")


def hyperlink(document: Document, template_run, label: str, url: str):
    relationship_id = document.part.relate_to(url, RT.HYPERLINK, is_external=True)
    hyperlink_xml = OxmlElement("w:hyperlink")
    hyperlink_xml.set(qn("r:id"), relationship_id)
    hyperlink_xml.set(qn("w:history"), "1")

    run_xml = deepcopy(template_run)
    set_run_text(run_xml, label)
    run_properties = run_xml.find(qn("w:rPr"))
    if run_properties is None:
        run_properties = OxmlElement("w:rPr")
        run_xml.insert(0, run_properties)

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

    hyperlink_xml.append(run_xml)
    return hyperlink_xml


def plain_run(template_run, text: str):
    run_xml = deepcopy(template_run)
    set_run_text(run_xml, text)
    return run_xml


def main() -> None:
    document = Document(SOURCE)
    paragraph = paragraph_by_prefix(document, "Apache Magpie PR #1379:")
    paragraph_xml = paragraph._p

    template_run = paragraph_xml.find(qn("w:r"))
    if template_run is None:
        template_run = paragraph_xml.find(".//" + qn("w:r"))
    if template_run is None:
        raise RuntimeError("Magpie contribution paragraph has no run")

    for child in list(paragraph_xml):
        if child.tag != qn("w:pPr"):
            paragraph_xml.remove(child)

    paragraph_xml.append(
        hyperlink(
            document,
            template_run,
            "Apache Magpie PR #1379",
            "https://github.com/apache/magpie/pull/1379",
        )
    )
    paragraph_xml.append(
        plain_run(
            template_run,
            ": Cut optimize-skill context 24% with 7/7 evals; ",
        )
    )
    paragraph_xml.append(
        hyperlink(
            document,
            template_run,
            "PR #1480",
            "https://github.com/apache/magpie/pull/1480",
        )
    )
    paragraph_xml.append(
        plain_run(
            template_run,
            ": Cut good-first-issue-author routing metadata 38% (273 to 168 tokens) while preserving safeguards.",
        )
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
