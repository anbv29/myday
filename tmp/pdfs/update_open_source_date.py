from pathlib import Path

from docx import Document


SOURCE = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_work_portfolio.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_current.docx")
OLD_TEXT = "Open Source Contributions, GitHub\tSep 2026"
NEW_DATE = "\tSept 2026 - Present"


def main() -> None:
    document = Document(SOURCE)
    matches = [paragraph for paragraph in document.paragraphs if paragraph.text == OLD_TEXT]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one Open Source Contributions heading; found {len(matches)}")

    text_nodes = matches[0]._p.xpath(".//w:t")
    if len(text_nodes) != 2:
        raise RuntimeError(f"Unexpected heading structure with {len(text_nodes)} text nodes")
    text_nodes[1].text = NEW_DATE

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
