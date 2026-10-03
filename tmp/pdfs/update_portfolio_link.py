from pathlib import Path

from docx import Document
from docx.oxml.ns import qn


SOURCE = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_work.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_work_portfolio.docx")
OLD_URLS = {
    "https://portf-chi-two.vercel.app",
    "https://portf-chi-two.vercel.app/",
}
NEW_URL = "https://anbv.vercel.app"
OLD_TEXT = "portf-chi-two.vercel.app"
NEW_TEXT = "anbv.vercel.app"


def main() -> None:
    document = Document(SOURCE)

    matching_relationships = [
        relationship
        for relationship in document.part.rels.values()
        if relationship.reltype.endswith("/hyperlink")
        and relationship.target_ref in OLD_URLS
    ]
    if len(matching_relationships) != 1:
        raise RuntimeError(
            f"Expected one portfolio hyperlink relationship; found {len(matching_relationships)}"
        )

    relationship = matching_relationships[0]
    relationship._target = NEW_URL

    matching_text_nodes = [
        node
        for node in document.element.xpath(".//w:hyperlink//w:t")
        if (node.text or "") == OLD_TEXT
    ]
    if len(matching_text_nodes) != 1:
        raise RuntimeError(
            f"Expected one visible portfolio URL; found {len(matching_text_nodes)}"
        )
    matching_text_nodes[0].text = NEW_TEXT

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
