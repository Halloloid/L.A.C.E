from gliner import GLiNER

model = GLiNER.from_pretrained("gliner-community/gliner_small-v2.5")

labels = [
    "mrp",
    "net quantity",
    "mfg date",
    "batch number",
    "manufacturer address"
]

test_cases = {
    "Case 1 - Standard": """
M.R.P. ₹120.00
Net Quantity 500 g
Mfg. Date 08/2026
Batch No. B1234
Manufactured by ABC Foods Pvt Ltd,
Kolkata - 700001
""",

    "Case 2 - Different formatting": """
Maximum Retail Price (Incl. of all taxes): Rs. 85
Net Wt. 200 g
Date of Mfg: 15/07/2026
Lot No: LF9281
Marketed by XYZ Consumer Products Ltd.
Mumbai, Maharashtra - 400001
""",

    "Case 3 - Hindi-style abbreviations / compact label": """
MRP ₹49.00
Net Qty: 100 ml
MFD: 06/2026
Batch: A7K92
Manufactured & Packed by Fresh Foods Pvt. Ltd.
New Delhi - 110001
""",

    "Case 4 - Address-heavy": """
MRP: ₹250
Net Quantity: 1 kg
Packed on: 01/09/2026
Batch Number: PK20260901
Manufactured by:
Sunrise Foods Private Limited
Plot No. 12, Industrial Area
Bhubaneswar, Odisha - 751010
""",

    "Case 5 - Messy OCR-like text": """
M.R.P Rs 199.00 incl all taxes
Net Quantlty 250 g
Mfg Date 09/2026
Bach No. BX1029
Mfd by ABC Industries Pvt Ltd
Kolkata West Bengal 700091
""",
}

for case_name, text in test_cases.items():

    print("\n" + "=" * 70)
    print(case_name)
    print("=" * 70)

    entities = model.predict_entities(text, labels)

    for entity in entities:
        print(
            f"{entity['label']:15} | "
            f"{entity['text']:<50} | "
            f"score={entity['score']:.3f}"
        )