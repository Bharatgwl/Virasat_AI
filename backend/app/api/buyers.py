from fastapi import APIRouter, Depends

from app.api.dependencies import current_buyer_account
from app.schemas.account import Account
from app.schemas.buyer import Buyer, BuyerCreate, BuyerUpdate
from app.services.buyer_service import create_buyer, get_buyer_by_account, update_buyer


router = APIRouter(prefix="/buyer/profile", tags=["buyer-profile"])


@router.post("", response_model=Buyer, status_code=201)
def create(request: BuyerCreate, account: Account = Depends(current_buyer_account)) -> Buyer:
    return create_buyer(request.model_copy(update={"account_id": account.id}))


@router.get("", response_model=Buyer)
def current_buyer(account: Account = Depends(current_buyer_account)) -> Buyer:
    return get_buyer_by_account(account.id)


@router.patch("", response_model=Buyer)
def update(request: BuyerUpdate, account: Account = Depends(current_buyer_account)) -> Buyer:
    buyer = get_buyer_by_account(account.id)
    return update_buyer(buyer.id, request)
