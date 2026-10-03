from copy import deepcopy
from pathlib import Path

from docx import Document


SOURCE = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_current.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_reach_metrics.docx")

SUMMARY = (
    "Full stack software engineer completing a B.Tech at NIT Jalandhar in 2026, focused on backend "
    "systems, concurrency, and failure-safe API design. Built a Razorpay-backed marketplace that "
    "stayed correct across 200+ concurrent bids and a multitenant RAG pipeline that processed 500+ "
    "documents at 90%+ extraction accuracy while reducing incorrect LLM responses by roughly 40%. "
    "Comfortable taking features from specification through production."
)

REACH_BULLET_1 = (
    "Delivered Node.js and Express.js REST endpoints and server-side integrations during a 2-month "
    "internship, taking product features from specification through production."
)

REACH_BULLET_2 = (
    "Contributed across 5 delivery stages - architecture, implementation, testing, code review, and "
    "release - and adopted the team's API and deployment standards within the first 2 weeks."
)


def paragraph_by_prefix(document: Document, prefix: str):
    matches = [paragraph for paragraph in document.paragraphs if paragraph.text.startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one paragraph starting with {prefix!r}; found {len(matches)}")
    return matches[0]


def replace_text(paragraph, value: str) -> None:
    text_nodes = paragraph._p.xpath(".//w:t")
    if len(text_nodes) != 1:
        raise RuntimeError(
            f"Expected one text node in paragraph {paragraph.text!r}; found {len(text_nodes)}"
        )
    text_nodes[0].text = value


def main() -> None:
    document = Document(SOURCE)

    summary = paragraph_by_prefix(document, "Full stack software engineer")
    replace_text(summary, SUMMARY)

    reach_bullet = paragraph_by_prefix(document, "Shipped Node.js and Express.js REST endpoints")
    replace_text(reach_bullet, REACH_BULLET_1)

    second_bullet_xml = deepcopy(reach_bullet._p)
    second_text_nodes = second_bullet_xml.xpath(".//w:t")
    if len(second_text_nodes) != 1:
        raise RuntimeError(
            f"Expected one text node in cloned internship bullet; found {len(second_text_nodes)}"
        )
    second_text_nodes[0].text = REACH_BULLET_2
    reach_bullet._p.addnext(second_bullet_xml)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
