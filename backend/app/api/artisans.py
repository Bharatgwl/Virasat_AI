from fastapi import APIRouter, Depends

from app.api.dependencies import current_seller
from app.schemas.account import Account
from app.schemas.artisan import Artisan, ArtisanCreate, ArtisanUpdate
from app.services.artisan_service import create_artisan, get_artisan_by_account, update_artisan


router = APIRouter(prefix="/seller/profile", tags=["seller-profile"])


@router.post("", response_model=Artisan, status_code=201)
def create(request: ArtisanCreate, account: Account = Depends(current_seller)) -> Artisan:
    return create_artisan(request.model_copy(update={"account_id": account.id}))


@router.get("", response_model=Artisan)
def current_artisan(account: Account = Depends(current_seller)) -> Artisan:
    return get_artisan_by_account(account.id)


@router.patch("", response_model=Artisan)
def update(request: ArtisanUpdate, account: Account = Depends(current_seller)) -> Artisan:
    artisan = get_artisan_by_account(account.id)
    return update_artisan(artisan.id, request)
