from app.schemas.catalog import CatalogDraft, CatalogRequest


def generate_mock_catalog(request: CatalogRequest) -> CatalogDraft:
    text = request.description.strip().lower()

    if "blue pottery" in text or "pen stand" in text:
        return CatalogDraft(
            title="Handmade Blue Pottery Pen Stand",
            description="A traditional handmade pen stand created using blue pottery techniques.",
            category="Home and Office",
            materials=["Clay", "Natural colours"],
            suggested_price=450,
        )
    if "brass" in text:
        return CatalogDraft(
            title="Handcrafted Brass Decor Piece",
            description="A decorative brass product handcrafted by an Indian artisan.",
            category="Home Decor",
            materials=["Brass"],
            suggested_price=900,
        )
    if "bag" in text or "textile" in text or "fabric" in text:
        return CatalogDraft(
            title="Handmade Artisan Textile Bag",
            description="A practical handmade textile bag featuring traditional artisan workmanship.",
            category="Bags and Accessories",
            materials=["Textile"],
            suggested_price=650,
        )

    source = request.description.strip() or "A handmade product described through a voice recording."
    return CatalogDraft(
        title="Handmade Artisan Product",
        description=source,
        category="Handicrafts",
        materials=["To be confirmed"],
        suggested_price=500,
    )

