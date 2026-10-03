from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree


SOURCE = Path(r"C:\Users\anubh\Downloads\anubhav_resume.docx")
OUTPUT = Path(r"C:\Users\anubh\Desktop\mydate\tmp\pdfs\anubhavPandey_resume_updated.docx")

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"w": W_NS}

REPLACEMENTS = {
    "Docker, Terraform, Vercel, GitHub Actions (CI/CD), Upstash Redis, Linux, Bash Scripting, Git, Microsoft Azure fundamentals (self taught, no hands on projects yet)":
        "Docker, Terraform, Vercel, GitHub Actions (CI/CD), Upstash Redis, Linux, Bash Scripting, Git, Microsoft Azure",
    "Throttle: Concurrency Safe Rate Limiting Service":
        "ThrottlFlow: Node.js Rate Limiting Package",
    "React.js, Node.js, Express.js, PostgreSQL (PERN Stack)":
        "Node.js, JavaScript, Express.js, PostgreSQL, npm, ES Modules",
    "Implemented Token Bucket and Sliding Window rate limiting on PostgreSQL transactions with row level locking (SELECT ... FOR UPDATE), holding zero race condition errors under a 1,000+ concurrent request per second load test.":
        "Published ThrottlFlow, an MIT-licensed npm package implementing exact sliding-window and token-bucket rate limiting with bounded in-memory storage and a PostgreSQL store for quotas shared across multiple Node.js instances.",
    "Packaged the limiter as a drop in Express middleware alongside a real time analytics dashboard, cutting integration time for a second internal service from a full day down to under an hour.":
        "Built Express middleware with 429 and Retry-After responses plus fail-closed 503 behavior on storage errors; hashed subject keys with SHA-256 and used PostgreSQL transactions with row-level locks to keep concurrent decisions consistent.",
}

OLD_LINK = "https://github.com/anbv29/Throttle"
NEW_LINK = "https://www.npmjs.com/package/throttlflow"


def replace_paragraph_text(root: etree._Element, old: str, new: str) -> None:
    matches = [
        node
        for node in root.xpath(".//w:t", namespaces=NS)
        if (node.text or "") == old
    ]

    if len(matches) != 1:
        raise RuntimeError(f"Expected one text node matching {old!r}; found {len(matches)}")

    matches[0].text = new


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with ZipFile(SOURCE, "r") as source_zip:
        document_root = etree.fromstring(source_zip.read("word/document.xml"))
        relationships_root = etree.fromstring(source_zip.read("word/_rels/document.xml.rels"))

        for old, new in REPLACEMENTS.items():
            replace_paragraph_text(document_root, old, new)

        link_matches = relationships_root.xpath(
            ".//*[local-name()='Relationship' and @Target=$target]",
            target=OLD_LINK,
        )
        if len(link_matches) != 1:
            raise RuntimeError(
                f"Expected one hyperlink relationship matching {OLD_LINK!r}; found {len(link_matches)}"
            )
        link_matches[0].set("Target", NEW_LINK)

        document_bytes = etree.tostring(
            document_root,
            xml_declaration=True,
            encoding="UTF-8",
            standalone="yes",
        )
        relationships_bytes = etree.tostring(
            relationships_root,
            xml_declaration=True,
            encoding="UTF-8",
            standalone="yes",
        )

        with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as output_zip:
            for item in source_zip.infolist():
                if item.filename == "word/document.xml":
                    data = document_bytes
                elif item.filename == "word/_rels/document.xml.rels":
                    data = relationships_bytes
                else:
                    data = source_zip.read(item.filename)
                output_zip.writestr(item, data)

    print(OUTPUT)


if __name__ == "__main__":
    main()
