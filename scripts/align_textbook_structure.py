#!/usr/bin/env python3
"""One-time migration of the EML study files to the textbook's numbered structure."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "eml"

BOOK = {
    "01-word-anatomy": ("The Anatomy of Medical Terms: The Essential Elements of the Language of Medicine", [
        ("The Construction of Medical Words", 2, 8, [0, 1, 2]),
        ("Word Deconstruction, Plurals, Pronunciation, and Precision", 9, 14, [3, 4, 5]),
    ]),
    "02-body-as-a-whole": ("The Body as a Whole, Cells, and Genes: The Essentials of the Languages of Anatomy and Genetics", [
        ("Composition of Body and Cells", 16, 19, [0]), ("Genes and Genetics", 20, 21, [1]),
        ("Genetic Medicine", 22, 23, []), ("Tissues, Organs, and Organ Systems", 24, 29, [2, 6]),
        ("Anatomical Positions, Planes, and Directions", 30, 33, [3, 4, 5, 7]),
    ]),
    "03-integumentary": ("The Integumentary System: The Essentials of the Language of Dermatology", [
        ("Functions and Structure of the Skin", 35, 40, [0, 1]),
        ("Disorders of the Skin and Accessory Organs", 41, 51, [2, 3, 4]),
        ("Diagnostic and Therapeutic Procedures and Pharmacology for Disorders", 52, 55, [6, 7]),
        ("Burns and Injuries to the Skin", 56, 62, [5]),
    ]),
    "04-skeletal": ("The Skeletal System: The Essentials of the Language of Orthopedics", [
        ("Bones of the Skeletal System", 64, 67, [0]), ("Axial and Appendicular Skeleton", 68, 78, [1, 2]),
        ("Disorders and Injuries of the Skeleton System", 79, 86, [3, 4, 5]),
        ("Diagnostic and Therapeutic Procedures and Pharmacology for Bone Disorders", 87, 95, [6, 7]),
    ]),
    "05-muscles-tendons": ("Muscles and Tendons: The Essentials of the Languages of Orthopedics and Rehabilitation", [
        ("Muscles and Tendons", 97, 99, [0, 1]),
        ("Muscles and Tendons of the Upper and Lower Extremities", 100, 103, [2]),
        ("Disorders and Injuries of Muscles and Tendons", 104, 106, [3, 4]),
        ("Physical Medicine and Rehabilitation (PM&R)", 107, 109, []),
        ("Procedures and Pharmacology", 110, 114, [5, 6]),
    ]),
    "06-cardiovascular": ("The Cardiovascular and Circulatory Systems: The Essentials of the Language of Cardiology", [
        ("The Heart", 116, 121, [0, 1, 2]), ("Circulatory Systems", 122, 124, [3]),
        ("Disorders and Diseases of the Heart and Circulatory System", 125, 134, [4, 5]),
        ("Diagnostic and Therapeutic Procedures and Pharmacology of the Heart and Circulatory Systems", 135, 143, [6, 7, 8]),
    ]),
    "07-blood-lymph-immune": ("The Blood, Lymphatic, and Immune Systems: The Essentials of the Languages of Hematology and Immunology", [
        ("Components and Functions of Blood", 145, 151, [0, 1, 2, 3]), ("Lymphatic System", 152, 159, [5]),
        ("Disorders of Blood and Blood Components", 160, 166, [4]),
        ("Disorders of the Lymphatic and Immune Systems", 167, 173, [6]),
        ("Diagnostic and Therapeutic Procedures and Pharmacology for the Blood, Lymphatic, and Immune Systems", 174, 182, [7, 8]),
    ]),
    "08-respiratory": ("The Respiratory System: The Essentials of the Language of Pulmonology", [
        ("Introduction to the Respiratory System", 184, 186, [2]), ("Upper Respiratory Tract", 187, 189, [0]),
        ("Lower Respiratory Tract", 190, 193, [1, 3]), ("Disorders of the Respiratory System", 194, 201, [4, 5]),
        ("Diagnostic and Therapeutic Procedures and Pharmacology", 202, 208, [6, 7, 8]),
    ]),
}

def blocks(text):
    lines = text.splitlines()
    out, current = [], None
    for line in lines[1:]:
        if line.startswith("## "):
            current = []
            out.append(current)
        elif current is not None and not line.startswith("@source "):
            current.append(line)
    return out

def main():
    for stem, (title, sections) in BOOK.items():
        path = DATA / f"{stem}.txt"
        old = blocks(path.read_text(encoding="utf-8"))
        num = int(stem[:2])
        lines = [f"# {num} | {title}", "// Aligned to Essentials of Medical Language (2024), supplied educational PDF."]
        for section_number, (name, start, end, indexes) in enumerate(sections, 1):
            lines += ["", f"## {name}", f"@source {start}-{end} | Textbook section {num}.{section_number}, pp. {start}-{end}"]
            for i in indexes:
                if i < len(old): lines += old[i]
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
