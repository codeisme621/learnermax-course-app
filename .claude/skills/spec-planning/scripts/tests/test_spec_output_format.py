"""Validate that existing specs conform to the spec-planning output format.

Tests the required structure: Slice Dependency Map, mermaid DAG, Signal sections,
and slice number/filename consistency.
"""

import re
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[5]
SPECS_DIR = PROJECT_ROOT / "specs"


def _discover_mainspecs():
    """Find all mainspec.md files in specs/*/."""
    return sorted(SPECS_DIR.glob("*/mainspec.md"))


def _discover_slices():
    """Find all slice .md files in specs/*/slices/."""
    return sorted(SPECS_DIR.glob("*/slices/*.md"))


MAINSPECS = _discover_mainspecs()
MAINSPEC_IDS = [p.parent.name for p in MAINSPECS]

SLICES = _discover_slices()
SLICE_IDS = [f"{p.parent.parent.name}/{p.name}" for p in SLICES]


# ---------------------------------------------------------------------------
# Test: Every mainspec has a "Slice Dependency Map" section
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("mainspec", MAINSPECS, ids=MAINSPEC_IDS)
def test_all_mainspecs_have_dependency_table(mainspec: Path):
    content = mainspec.read_text()
    assert re.search(
        r"^##\s+Slice Dependency Map", content, re.MULTILINE
    ), f"{mainspec.parent.name}/mainspec.md missing '## Slice Dependency Map' section"


# ---------------------------------------------------------------------------
# Test: Dependency table is parseable (Slice | Depends On | Blocks columns)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("mainspec", MAINSPECS, ids=MAINSPEC_IDS)
def test_dependency_table_is_parseable(mainspec: Path):
    content = mainspec.read_text()
    lines = content.split("\n")

    # Find the section
    in_section = False
    table_lines = []
    for line in lines:
        if re.match(r"^##\s+Slice Dependency Map", line):
            in_section = True
            continue
        if in_section:
            if line.startswith("## "):
                break
            if line.startswith("|"):
                table_lines.append(line)

    assert len(table_lines) >= 3, (
        f"{mainspec.parent.name}: dependency table needs header + separator + data rows, "
        f"found {len(table_lines)} table lines"
    )

    # Verify header columns
    header = table_lines[0]
    cols = [c.strip().lower() for c in header.split("|")]
    col_names = [c for c in cols if c]  # filter empty strings from leading/trailing |

    assert "slice" in col_names[0], f"First column should be 'Slice', got '{col_names[0]}'"
    assert any("depends" in c for c in col_names), (
        f"Table must have a 'Depends On' column, got: {col_names}"
    )
    assert any("blocks" in c for c in col_names), (
        f"Table must have a 'Blocks' column, got: {col_names}"
    )

    # Verify data rows parse correctly
    data_rows = table_lines[2:]  # skip header + separator
    assert len(data_rows) > 0, "Dependency table has no data rows"

    for row in data_rows:
        row_cols = [c.strip() for c in row.split("|")]
        non_empty = [c for c in row_cols if c]
        assert len(non_empty) >= 3, (
            f"Row should have at least 3 columns (Slice, Depends On, Blocks), got: {row}"
        )


# ---------------------------------------------------------------------------
# Test: Every mainspec has a mermaid code block with flowchart
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("mainspec", MAINSPECS, ids=MAINSPEC_IDS)
def test_all_mainspecs_have_mermaid_dag(mainspec: Path):
    content = mainspec.read_text()
    assert "```mermaid" in content, (
        f"{mainspec.parent.name}/mainspec.md missing mermaid code block"
    )
    assert re.search(r"flowchart\s+TD", content), (
        f"{mainspec.parent.name}/mainspec.md missing 'flowchart TD' in mermaid block"
    )


# ---------------------------------------------------------------------------
# Test: Every slice file has ## Signal section
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("slice_file", SLICES, ids=SLICE_IDS)
def test_all_slices_have_signal(slice_file: Path):
    content = slice_file.read_text()
    assert re.search(
        r"^##\s+Signal", content, re.MULTILINE
    ), f"{slice_file.name} missing '## Signal' section"


# ---------------------------------------------------------------------------
# Test: Slice numbers in dependency table match actual files in slices/
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("mainspec", MAINSPECS, ids=MAINSPEC_IDS)
def test_slice_numbers_match_filenames(mainspec: Path):
    content = mainspec.read_text()
    lines = content.split("\n")

    # Find dependency table
    in_section = False
    table_lines = []
    for line in lines:
        if re.match(r"^##\s+Slice Dependency Map", line):
            in_section = True
            continue
        if in_section:
            if line.startswith("## "):
                break
            if line.startswith("|"):
                table_lines.append(line)

    if len(table_lines) < 3:
        pytest.skip("No parseable dependency table found")

    # Extract slice numbers from the table (first column)
    data_rows = table_lines[2:]
    table_numbers = []
    for row in data_rows:
        cols = [c.strip() for c in row.split("|")]
        slice_col = cols[1] if len(cols) > 1 else ""
        # Match "X.Y — Name" pattern
        match = re.match(r"^([\d.]+)\s*[—–\-]", slice_col)
        if match:
            table_numbers.append(match.group(1))

    if not table_numbers:
        pytest.skip("Could not parse slice numbers from table (may use legacy format)")

    # Check that each slice number has a corresponding file
    slices_dir = mainspec.parent / "slices"
    if not slices_dir.exists():
        pytest.fail(f"slices/ directory missing for {mainspec.parent.name}")

    slice_files = list(slices_dir.glob("*.md"))
    file_prefixes = [f.name.split("-")[0] for f in slice_files]

    for num in table_numbers:
        assert num in file_prefixes, (
            f"Slice {num} in dependency table but no file starting with '{num}-' "
            f"in {slices_dir}. Files: {[f.name for f in slice_files]}"
        )
