import typing
from algopy import (
    ARC4Contract,
    Account,
    Application,
    BigUInt,
    Box,
    BoxMap,
    Bytes,
    Global,
    OpUpFeeSource,
    String,
    Txn,
    UInt64,
    arc4,
    ensure_budget,
    itxn,
    op,
    subroutine,
    urange,
)
from opensubmarine import (
    ARC200Token,
    Stakeable,
    Upgradeable,
    arc200_Transfer,
)
from opensubmarine.utils.algorand import require_payment

#
# TODO
# - [ ] - test to make sure the whole reel is being used
# - [ ] - test to make sure it is paying out
#

# =============================================================================
# TYPE ALIASES
# =============================================================================

Bytes500: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[500]]
Bytes100: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[100]]
Bytes56: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[56]]
Bytes32: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[32]]
Bytes15: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[15]]
Bytes8: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[8]]
Bytes5: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[5]]
Bytes3: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[3]]
Bytes1: typing.TypeAlias = arc4.StaticArray[arc4.Byte, typing.Literal[1]]

BOX_COST_BALANCE = 28500
MAX_CLAIM_ROUND_DELTA = 1000
SCALING_FACTOR = 10**12


class BankBalances(arc4.Struct):
    balance_available: arc4.UInt64
    balance_total: arc4.UInt64
    balance_locked: arc4.UInt64
    balance_fuse: arc4.Bool


class SpinParams(arc4.Struct):
    max_extra_payment: arc4.UInt64
    max_payout_multiplier: arc4.UInt64
    round_future_delta: arc4.UInt64
    min_bet_amount: arc4.UInt64
    max_bet_amount: arc4.UInt64
    min_bank_amount: arc4.UInt64
    spin_fuse: arc4.Bool


class PaylineMatch(arc4.Struct):
    count: arc4.UInt64
    symbol: arc4.Byte


class Bet(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64


class BetPlaced(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64


class BetClaimed(arc4.Struct):
    who: arc4.Address
    amount: arc4.UInt64
    max_payline_index: arc4.UInt64
    index: arc4.UInt64
    claim_round: arc4.UInt64
    payout: arc4.UInt64


class BootstrappedInterface(ARC4Contract):

    @arc4.abimethod
    def bootstrap(self) -> None:
        payment = require_payment(Txn.sender)
        assert payment >= self._bootstrap_cost(), "insufficient payment for bootstrap"
        self._bootstrap()

    @subroutine
    def _bootstrap(self) -> None:
        pass

    @arc4.abimethod(readonly=True)
    def bootstrap_cost(self) -> arc4.UInt64:
        return arc4.UInt64(self._bootstrap_cost())

    @subroutine
    def _bootstrap_cost(self) -> UInt64:
        return UInt64()


class Bootstrapped(BootstrappedInterface):

    @subroutine
    def _bootstrap_cost(self) -> UInt64:
        return Global.min_balance


class OwnableInterface(ARC4Contract):
    """
    A simple ownable smart contract
    """

    @subroutine
    def _only_owner(self) -> None:
        """
        Only the owner can call this function (internal)
        """
        assert Txn.sender == self._get_owner(), "only the owner can call this function"

    @arc4.abimethod(readonly=True)
    def get_owner(self) -> arc4.Address:
        """
        Get the owner of the contract
        """
        return arc4.Address(self._get_owner())

    @subroutine
    def _get_owner(self) -> Account:
        """
        Get the owner of the contract (internal)
        """
        return Account()

    @arc4.abimethod
    def transfer_ownership(self, new_owner: arc4.Address) -> None:
        """
        Transfer the ownership of the contract
        """
        self._transfer_ownership(new_owner.native)

    @subroutine
    def _transfer_ownership(self, new_owner: Account) -> None:
        """
        Transfer the ownership of the contract (internal)
        """
        pass


class Ownable(OwnableInterface):
    """
    A simple ownable smart contract
    """

    @arc4.abimethod
    def bootstrap(self) -> None:
        payment = require_payment(Txn.sender)
        assert payment >= self._bootstrap_cost(), "insufficient payment for bootstrap"
        self._bootstrap()

    @subroutine
    def _bootstrap(self) -> None:
        self._ownable_bootstrap()

    @arc4.abimethod(readonly=True)
    def bootstrap_cost(self) -> arc4.UInt64:
        return arc4.UInt64(self._bootstrap_cost())

    @subroutine
    def _bootstrap_cost(self) -> UInt64:
        return Global.min_balance + self._ownable_bootstrap_cost()

    @subroutine
    def _ownable_bootstrap_cost(self) -> UInt64:
        return UInt64(17300)

    @subroutine
    def _ownable_bootstrap(self) -> None:
        Box(Account, key="owner").value = Global.creator_address

    @subroutine
    def _only_owner(self) -> None:
        """
        Only the owner can call this function
        """
        assert Txn.sender == self._get_owner(), "only the owner can call this function"

    # override
    @subroutine
    def _get_owner(self) -> Account:
        return Box(Account, key="owner").get(default=Global.creator_address)

    # override
    @subroutine
    def _transfer_ownership(self, new_owner: Account) -> None:
        Box(Account, key="owner").value = new_owner


# TODO migrate to opensubmarine

# <https://github.com/VoiNetwork/smart-contract-staking/blob/next/src/contract.py#L342>


class TouchableInterface(ARC4Contract):
    """
    A simple touchable contract
    """

    @arc4.abimethod
    def touch(self) -> None:
        """
        Touch the contract
        """
        pass


class Touchable(TouchableInterface):
    """
    A simple touchable contract
    """

    def __init__(self) -> None:
        pass


# REM Beacon mostly for testing but can be used for production
# especially when it comes to taking advantage of group resource
# sharing


class Beacon(Touchable, Upgradeable):
    """
    A simple beacon contract
    """

    def __init__(self) -> None:
        # ownable state
        self.owner = Global.creator_address
        # upgradable state
        self.upgrader = Global.creator_address
        self.contract_version = UInt64()
        self.deployment_version = UInt64()
        self.updatable = bool(1)
        # deleteable state
        self.deletable = bool(1)

    @arc4.abimethod
    def post_update(self) -> None:
        """
        Post update
        """
        assert Txn.sender == self.upgrader, "must be upgrader"

    @arc4.abimethod
    def nop(self) -> None:
        """
        No operation
        """
        pass


class ReelManagerInterface(ARC4Contract):
    """
    A simple Reel5 smart contract that inherits from Ownable.
    """

    @arc4.abimethod(readonly=True)
    def get_reels(self) -> Bytes500:
        return Bytes500.from_bytes(self._get_reels())

    @subroutine
    def _get_reels(self) -> Bytes:
        return Bytes()

    @arc4.abimethod(readonly=True)
    def get_reel(self, reel: arc4.UInt64) -> Bytes100:
        """
        Get the reel at the given index.
        """
        return Bytes100.from_bytes(self._get_reel(reel.native))

    @subroutine
    def _get_reel(self, reel: UInt64) -> Bytes:
        """
        Get the reel at the given index.
        """
        return Bytes()

    @arc4.abimethod(readonly=True)
    def get_slot(self, reel: arc4.UInt64, index: arc4.UInt64) -> Bytes1:
        """
        Get the slot at the given index.
        """
        return Bytes1.from_bytes(self._get_slot(reel.native, index.native))

    @subroutine
    def _get_slot(self, reel: UInt64, index: UInt64) -> Bytes:
        return Bytes()

    @arc4.abimethod(readonly=True)
    def get_reel_window(self, reel: arc4.UInt64, index: arc4.UInt64) -> Bytes3:
        """
        Get the reel window at the given index.
        """
        return Bytes3.from_bytes(self._get_reel_window(reel.native, index.native))

    @subroutine
    def _get_reel_window(self, reel: UInt64, index: UInt64) -> Bytes:
        return Bytes()

    @arc4.abimethod(readonly=True)
    def get_reel_length(self) -> arc4.UInt64:
        return arc4.UInt64(self._get_reel_length())

    @subroutine
    def _get_reel_length(self) -> UInt64:
        return UInt64(0)

    @arc4.abimethod(readonly=True)
    def get_reel_count(self) -> arc4.UInt64:
        return arc4.UInt64(self._get_reel_count())

    @subroutine
    def _get_reel_count(self) -> UInt64:
        return UInt64(0)


class ReelManager(ReelManagerInterface):
    """
    A simple reel manager smart contract
    """

    # override
    @arc4.abimethod(readonly=True)
    def get_reel(self, reel: arc4.UInt64) -> Bytes100:
        """
        Get the reel at the given index. Ensures the reel index is within bounds.
        """
        assert reel < self._get_reel_count()
        return Bytes100.from_bytes(self._get_reel(reel.native))

    # override
    @subroutine
    def _get_reel(self, index: UInt64) -> Bytes:
        """
        Get the reel at the given index.
        """
        reel_length = self._get_reel_length()
        return self._get_reels()[index * reel_length : (index + 1) * reel_length]

    # override
    @arc4.abimethod(readonly=True)
    def get_slot(self, reel: arc4.UInt64, index: arc4.UInt64) -> Bytes1:
        """
        Get the slot at the given index. Ensures the reel index and slot index are within bounds.
        """
        assert reel < self._get_reel_count()
        assert index < self._get_reel_length()
        return Bytes1.from_bytes(self._get_slot(reel.native, index.native))

    # override
    @subroutine
    def _get_slot(self, reel: UInt64, index: UInt64) -> Bytes:
        reel_length = self._get_reel_length()
        return self._get_reels()[
            reel * reel_length + index : reel * reel_length + index + 1
        ]

    # override
    @arc4.abimethod(readonly=True)
    def get_reel_window(self, reel: arc4.UInt64, index: arc4.UInt64) -> Bytes3:
        """
        Get the reel window at the given index. Ensures the reel index and window index are within bounds.
        """
        assert reel < self._get_reel_count()
        # REM don't need this check as we're using % operator
        # assert index < self._get_reel_length()
        return Bytes3.from_bytes(self._get_reel_window(reel.native, index.native))

    # override
    @subroutine
    def _get_reel_window(self, reel: UInt64, index: UInt64) -> Bytes:
        """
        Get the window of the reel at the given index used to generate the grid.
        Wraps around to the beginning of the reel if needed.
        """
        reel_data = self._get_reel(reel)
        reel_length = self._get_reel_length()

        pos1 = (index + UInt64(0)) % reel_length
        pos2 = (index + UInt64(1)) % reel_length
        pos3 = (index + UInt64(2)) % reel_length

        # Get all three bytes in one slice if positions are consecutive
        if pos1 + UInt64(2) == pos3 and pos1 + UInt64(1) == pos2:
            return reel_data[pos1 : pos3 + 1]

        # Otherwise use single concat for non-consecutive positions (wrap-around case)
        return (
            reel_data[pos1 : pos1 + 1]
            + reel_data[pos2 : pos2 + 1]
            + reel_data[pos3 : pos3 + 1]
        )

    # override
    @subroutine
    def _get_reel_length(self) -> UInt64:
        """
        Get the length of the reel.
        """
        return Box(UInt64, key="reel_length").get(default=UInt64(100))

    # override
    @subroutine
    def _get_reel_count(self) -> UInt64:
        """
        Get the number of reels.
        """
        return Box(UInt64, key="reel_count").get(default=UInt64(5))

    # override
    @subroutine
    def _get_reels(self) -> Bytes:
        return Box(Bytes, key="reels").get(
            default=(
                Bytes(
                    b"_CCC__BD___D_____D_____D__DBDDCC_D_C_D__AD_D_CB_C_A_B___B_______DD___D_C_A_____B__C__D______D_______"
                    + b"C_A_____C__DC_____B__B_CD_B___CD__DAD__C__C______CDD_______C_DA________DDD____CDDD___DB____BD__B____"
                    + b"___D_D_B_________CD__D__C_C____B__A___CDB__BC_D__D__CD_C_________D___A_DC__B______B_DDDDD_____C_CDA_"
                    + b"C___C_CDDDDC__D__CCB____D_B__B______D______BD_____A____D_D__AD__D__B___B__C____A____C_D_D___C__CDD__"
                    + b"_________________CC___DC___DDB_BDADDC______B____C__D___D__CA_______CD__D_D_C_______BD_C_DBA_BDD__CD_"
                )
            )
        )

    @subroutine
    def _get_reel_window_length(self) -> UInt64:
        return Box(UInt64, key="reel_window_length").get(default=UInt64(3))

    @subroutine
    def _load_reels(self, reals: Bytes500) -> None:
        pass

    @subroutine
    def _update_reel_length(self, reel_length: UInt64) -> None:
        pass

    @subroutine
    def _update_reel_count(self, reel_count: UInt64) -> None:
        pass


class BankManagerInterface(ARC4Contract):
    """
    A simple bank manager smart contract
    """

    @arc4.abimethod
    def deposit(self) -> None:
        """
        Deposit funds into the contract
        """
        self._deposit()

    @subroutine
    def _deposit(self) -> None:
        """
        Deposit funds into the contract
        """
        pass

    @arc4.abimethod
    def withdraw(self, amount: arc4.UInt64) -> None:
        """
        Withdraw funds from the contract
        Only callable by contract owner

        Args:
            amount: The amount of funds to withdraw in atomic units
        """
        self._withdraw(amount.native)

    @subroutine
    def _withdraw(self, amount: UInt64) -> None:
        """
        Withdraw funds from the contract
        """
        pass

    @arc4.abimethod(readonly=True)
    def get_balances(self) -> BankBalances:
        """
        Get the balance fuse
        """
        return BankBalances(
            balance_available=arc4.UInt64(0),
            balance_total=arc4.UInt64(0),
            balance_locked=arc4.UInt64(0),
            balance_fuse=arc4.Bool(False),
        )

    @arc4.abimethod(readonly=True)
    def get_balance_available(self) -> arc4.UInt64:
        """
        Get the available balance
        """
        return arc4.UInt64(self._get_balance_available())

    @subroutine
    def _get_balance_available(self) -> UInt64:
        """
        Get the available balance
        """
        return UInt64(0)

    @arc4.abimethod(readonly=True)
    def get_balance_locked(self) -> arc4.UInt64:
        """
        Get the locked balance
        """
        return arc4.UInt64(self._get_balance_locked())

    @subroutine
    def _get_balance_locked(self) -> UInt64:
        """
        Get the locked balance
        """
        return UInt64(0)

    @arc4.abimethod(readonly=True)
    def get_balance_total(self) -> arc4.UInt64:
        """
        Get the total balance
        """
        return arc4.UInt64(self._get_balance_total())

    @subroutine
    def _get_balance_total(self) -> UInt64:
        """
        Get the total balance
        """
        return UInt64(0)


class BankManager(BankManagerInterface, Bootstrapped, Ownable):
    """
    A simple bank manager smart contract

    Boxes:

    balance_fuse bool
    balance_total UInt64
    balance_available UInt64
    blaance_locked UInt64
    """

    # --- bootstrap ---

    # override
    @subroutine
    def _bootstrap(self) -> None:
        self._bank_manager_bootstrap()

    # ovrride
    @subroutine
    def _bootstrap_cost(self) -> UInt64:
        return Global.min_balance + self._bank_manager_bootstrap_cost()

    @subroutine
    def _bank_manager_bootstrap(self) -> None:
        self._initialize_bank_manager_storage()

    @subroutine
    def _bank_manager_bootstrap_cost(self) -> UInt64:
        return UInt64(17700)

    @subroutine
    def _initialize_bank_manager_storage(self) -> None:
        """
        Initialize storage for balances boxes
        """
        self._only_owner()
        bank_balances = self._invalid_balances()
        assert (
            not self._bank_balances().balance_fuse.native
        ), "bank balances must not be initialized"
        bank_balances.balance_fuse = arc4.Bool(True)
        Box(BankBalances, key="bank_balances").value = bank_balances.copy()

    # --- implementation ---

    @arc4.abimethod
    def owner_deposit(self, amount: arc4.UInt64) -> None:
        """
        Deposit funds into the contract as owner. The owner is expected to
        have already submitted the payment.
        """
        self._only_owner()
        self._increment_balance_total(amount.native)
        self._increment_balance_available(amount.native)

    # override
    @subroutine
    def _deposit(self) -> None:
        """
        Deposit funds into the contract
        """
        payment = require_payment(Txn.sender)
        assert payment > 0, "payment must be greater than 0"
        self._increment_balance_total(payment)
        self._increment_balance_available(payment)

    # override
    @subroutine
    def _withdraw(self, amount: UInt64) -> None:
        """
        Withdraw funds from the contract
        Only callable by contract owner

        Args:
            amount: The amount of funds to withdraw in atomic units
        """
        self._only_owner()
        assert amount > UInt64(0), "amount must be greater than 0"
        assert amount <= self._get_balance_available(), "insufficient balance"
        assert amount <= self._get_balance_total(), "insufficient balance"
        itxn.Payment(receiver=Txn.sender, amount=amount).submit()
        self._decrement_balance_available(amount)
        self._decrement_balance_total(amount)

    @subroutine
    def _invalid_balances(self) -> BankBalances:
        return BankBalances(
            balance_available=arc4.UInt64(0),
            balance_total=arc4.UInt64(0),
            balance_locked=arc4.UInt64(0),
            balance_fuse=arc4.Bool(False),
        )

    # override
    @arc4.abimethod(readonly=True)
    def get_balances(self) -> BankBalances:
        """
        Get the balances
        """
        return self._bank_balances()

    @subroutine
    def _bank_balances(self) -> BankBalances:
        return Box(BankBalances, key="bank_balances").get(
            default=self._invalid_balances()
        )

    @subroutine
    def _get_balance_available(self) -> UInt64:
        return self._bank_balances().balance_available.native

    @subroutine
    def _increment_balance_available(self, amount: UInt64) -> None:
        bank_balances = self._bank_balances()
        bank_balances.balance_available = arc4.UInt64(
            bank_balances.balance_available.native + amount
        )
        Box(BankBalances, key="bank_balances").value = bank_balances.copy()

    @subroutine
    def _decrement_balance_available(self, amount: UInt64) -> None:
        bank_balances = self._bank_balances()
        assert (
            bank_balances.balance_available.native >= amount
        ), "balance available is less than amount"
        bank_balances.balance_available = arc4.UInt64(
            bank_balances.balance_available.native - amount
        )
        Box(BankBalances, key="bank_balances").value = bank_balances.copy()

    @subroutine
    def _get_balance_locked(self) -> UInt64:
        return self._bank_balances().balance_locked.native

    @subroutine
    def _increment_balance_locked(self, amount: UInt64) -> None:
        bank_balances = self._bank_balances()
        bank_balances.balance_locked = arc4.UInt64(
            bank_balances.balance_locked.native + amount
        )
        Box(BankBalances, key="bank_balances").value = bank_balances.copy()

    @subroutine
    def _decrement_balance_locked(self, amount: UInt64) -> None:
        bank_balances = self._bank_balances()
        assert (
            bank_balances.balance_locked.native >= amount
        ), "balance locked is less than amount"
        bank_balances.balance_locked = arc4.UInt64(
            bank_balances.balance_locked.native - amount
        )
        Box(BankBalances, key="bank_balances").value = bank_balances.copy()

    @subroutine
    def _get_balance_total(self) -> UInt64:
        return self._bank_balances().balance_total.native

    @subroutine
    def _increment_balance_total(self, amount: UInt64) -> None:
        bank_balances = self._bank_balances()
        bank_balances.balance_total = arc4.UInt64(
            bank_balances.balance_total.native + amount
        )
        Box(BankBalances, key="bank_balances").value = bank_balances.copy()

    @subroutine
    def _decrement_balance_total(self, amount: UInt64) -> None:
        bank_balances = self._bank_balances()
        assert (
            bank_balances.balance_total.native >= amount
        ), "balance total is less than amount"
        bank_balances.balance_total = arc4.UInt64(
            bank_balances.balance_total.native - amount
        )
        Box(BankBalances, key="bank_balances").value = bank_balances.copy()


class SpinManagerInterface(ARC4Contract):
    """
    A simple spin manager smart contract
    """

    @arc4.abimethod
    def spin(
        self,
        bet_amount: arc4.UInt64,
        max_payline_index: arc4.UInt64,
        index: arc4.UInt64,
    ) -> Bytes56:
        """
        Spin the slot machine. Outcome is determined by the seed
        of future round.

        Args:
            bet (uint): The player's wager.
            max_payline_index (uint): The maximum payline index.
            index (uint): Player's choice of index.

        Returns:
            bet_key (bytes): The bet key.
        """
        return Bytes56.from_bytes(
            self._spin(bet_amount.native, max_payline_index.native, index.native)
        )

    @arc4.abimethod
    def spin_cost(self) -> arc4.UInt64:
        return arc4.UInt64(self._spin_cost())

    @subroutine
    def _spin_cost(self) -> UInt64:
        return UInt64(0)

    @subroutine
    def _spin(
        self, bet_amount: UInt64, max_payline_index: UInt64, index: UInt64
    ) -> Bytes:
        """
        Spin the slot machine. Outcome is determined by the seed
        of future round.

        Args:
            bet_amount (uint): The player's wager.
            max_payline_index (uint): The maximum payline index.
            index (uint): Player's choice of index.

        Returns:
            bet_key (bytes): The bet key.
        """
        return Bytes.from_base64(
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
        )

    @arc4.abimethod
    def claim(self, bet_key: Bytes56) -> arc4.UInt64:
        """
        Claim a bet

        Args:
            bet_key: The key of the bet to claim

        Returns:
            payout: The payout for the bet
        """
        return arc4.UInt64(self._claim(bet_key.bytes))

    @subroutine
    def _claim(self, bet_key: Bytes) -> UInt64:
        """
        Claim a bet

        Args:
            bet_key: The key of the bet to claim

        Returns:
            payout: The payout for the bet
        """
        return UInt64(0)

class SpinManager(SpinManagerInterface, BankManager, Ownable):
    """
    A simple spin manager smart contract
    """

    def __init__(self) -> None:
        self.bet = BoxMap(Bytes, Bet, key_prefix="")

    @subroutine
    def _get_bet(self, bet_key: Bytes) -> Bet:
        return self.bet.get(
            bet_key,
            default=Bet(
                who=arc4.Address(Global.zero_address),
                amount=arc4.UInt64(0),
                max_payline_index=arc4.UInt64(0),
                claim_round=arc4.UInt64(0),
                index=arc4.UInt64(0),
            ),
        )

    @arc4.abimethod(readonly=True)
    def get_bet_claim_round(self, bet_key: Bytes56) -> arc4.UInt64:
        return arc4.UInt64(self._get_bet_claim_round(bet_key.bytes))

    @subroutine
    def _get_bet_claim_round(self, bet_key: Bytes) -> UInt64:
        return self._get_bet(bet_key).claim_round.native

    # --- bootstrap ---

    # inherits boostrapped from bank manager
    #  does not attempt to boostrap for it

    # override
    @subroutine
    def _bootstrap(self) -> None:
        pass

    # override
    @subroutine
    def _bootstrap_cost(self) -> UInt64:
        return Global.min_balance

    # --- implementation ---

    @subroutine
    def _spin_params(self) -> SpinParams:
        return SpinParams(
            max_extra_payment=arc4.UInt64(1 * 10**6),  # 1 VOI
            max_payout_multiplier=arc4.UInt64(10000),  # 10000x
            round_future_delta=arc4.UInt64(1),  # 1 round
            min_bet_amount=arc4.UInt64(1 * 10**6),  # 1 VOI
            max_bet_amount=arc4.UInt64(2000 * 10**6),  # 2000 VOI
            min_bank_amount=arc4.UInt64(100000000000),  # 100k VOI
            spin_fuse=arc4.Bool(True),
        )

    @subroutine
    def _get_max_extra_payment(self) -> UInt64:
        return self._spin_params().max_extra_payment.native

    @subroutine
    def _get_max_payout_multiplier(self) -> UInt64:
        return self._spin_params().max_payout_multiplier.native

    @subroutine
    def _get_round_future_delta(self) -> UInt64:
        return self._spin_params().round_future_delta.native

    @subroutine
    def _get_min_bet_amount(self) -> UInt64:
        """
        min bet amount is 1 VOI
        """
        return self._spin_params().min_bet_amount.native

    @subroutine
    def _get_max_bet_amount(self) -> UInt64:
        """
        max bet amount is 9 VOI. Must be adjusted for the max payout multiplier and
        max payout index
        """
        return self._spin_params().max_bet_amount.native

    @subroutine
    def _get_min_bank_amount(self) -> UInt64:
        return self._spin_params().min_bank_amount.native

    @arc4.abimethod
    def get_bet_key(
        self,
        address: arc4.Address,
        amount: arc4.UInt64,
        max_payline_index: arc4.UInt64,
        index: arc4.UInt64,
    ) -> Bytes56:
        return Bytes56.from_bytes(
            self._get_bet_key(
                address.native, amount.native, max_payline_index.native, index.native
            )
        )

    @subroutine
    def _get_bet_key(
        self, address: Account, amount: UInt64, max_payline_index: UInt64, index: UInt64
    ) -> Bytes:
        return (
            arc4.Address(address).bytes
            + arc4.UInt64(amount).bytes
            + arc4.UInt64(max_payline_index).bytes
            + arc4.UInt64(index).bytes
        )

    # override
    @subroutine
    def _spin_cost(self) -> UInt64:
        return UInt64(50500)

    @arc4.abimethod
    def spin_payline_cost(self) -> arc4.UInt64:
        return arc4.UInt64(self._spin_payline_cost())

    @subroutine
    def _spin_payline_cost(self) -> UInt64:
        return UInt64(30000)

    @subroutine
    def _lockup_amount(self, bet_amount: UInt64) -> UInt64:
        return bet_amount * self._spin_params().max_payout_multiplier.native

    @subroutine
    def _spin(
        self, bet_amount: UInt64, max_payline_index: UInt64, index: UInt64
    ) -> Bytes:
        """
        Spin the slot machine. Outcome is determined by the seed
        of future round.

        Args:
            bet (uint): The player's wager.
            index (uint): Player's choice of index.

        Returns:
            r (uint): The round number of the spin.
        """
        # payment assertions
        expected_payment_amount = bet_amount * (max_payline_index + UInt64(1))
        assert (
            expected_payment_amount >= self._get_min_bet_amount()
        ), "bet amount too small"
        assert (
            expected_payment_amount <= self._get_max_bet_amount()
        ), "bet amount too large"
        actual_payment_amount = require_payment(Txn.sender)
        assert actual_payment_amount >= expected_payment_amount, "payment insufficient"
        extra_payment_amount = actual_payment_amount - expected_payment_amount
        # extra payment amount must less than max but greater than min costs
        min_costs = self._spin_cost()  # + self._spin_payline_cost() * (
        #    max_payline_index + UInt64(1)
        # )
        assert (
            extra_payment_amount >= min_costs
        ), "extra payment must be greater than box cost"
        assert (
            extra_payment_amount <= self._get_max_extra_payment()
        ), "extra payment must be less than max extra payment"
        # bank assertions
        # lock spin if balance total is less than min bank amount
        assert (
            self._get_balance_total() >= self._get_min_bank_amount()
        ), "balance total must be greater than min bank amount"
        # Update balance tracking
        #   Add bet amount to total balance
        # assert max payline index is less than max index
        self._increment_balance_total(expected_payment_amount)
        self._increment_balance_available(expected_payment_amount)
        # Lock up amount
        lockup_amount = self._lockup_amount(bet_amount)
        self._increment_balance_locked(lockup_amount)
        self._decrement_balance_available(lockup_amount)
        # Create bet
        confirmed_round = Global.round
        bet_key = self._get_bet_key(Txn.sender, bet_amount, max_payline_index, index)
        assert bet_key not in self.bet, "bet already exists"
        claim_round = confirmed_round + self._get_round_future_delta()
        self.bet[bet_key] = Bet(
            who=arc4.Address(Txn.sender),
            amount=arc4.UInt64(bet_amount),
            max_payline_index=arc4.UInt64(max_payline_index),
            index=arc4.UInt64(index),
            claim_round=arc4.UInt64(claim_round),
        )
        arc4.emit(
            BetPlaced(
                who=arc4.Address(Txn.sender),
                amount=arc4.UInt64(bet_amount),
                max_payline_index=arc4.UInt64(max_payline_index),
                index=arc4.UInt64(index),
                claim_round=arc4.UInt64(claim_round),
            )
        )
        return bet_key


class SlotMachine(SpinManager, ReelManager, Ownable, Upgradeable):
    """
    A simple reel slot machine smart contract

    Boxes:
        balance*
        *others*
            slot machine
                payline_count UInt64 (default: 9)
                paylines UInt64[45] (default: *)

    """

    def __init__(self) -> None:
        # upgradeable state
        self.upgrader = Global.creator_address
        self.contract_version = UInt64(0)
        self.deployment_version = UInt64(7)
        self.updatable = bool(1)

    @arc4.abimethod
    def post_update(self) -> None:
        """
        Post upgrade
        """
        assert Txn.sender == self.upgrader, "must be upgrader"
        self.contract_version = UInt64(0)
        self.deployment_version = UInt64(7)

    @arc4.abimethod
    def bootstrap(self) -> None:
        payment = require_payment(Txn.sender)
        assert payment >= self._bootstrap_cost(), "insuffienct payment for bootstrap"
        self._bootstrap()

    @arc4.abimethod(readonly=True)
    def bootstrap_cost(self) -> arc4.UInt64:
        return arc4.UInt64(self._bootstrap_cost())

    # override
    @subroutine
    def _bootstrap(self) -> None:
        self._bank_manager_bootstrap()
        self._ownable_bootstrap()

    # override
    @subroutine
    def _bootstrap_cost(self) -> UInt64:
        return (
            Global.min_balance
            + self._bank_manager_bootstrap_cost()
            + self._ownable_bootstrap_cost()
        )

    # --- ownable ---

    # override
    @arc4.abimethod
    def transfer_ownership(self, new_owner: arc4.Address) -> None:
        """
        Transfer the ownership of the contract
        """
        self._only_owner()
        self._transfer_ownership(new_owner.native)

    # --- Grid ---

    @subroutine
    def _get_reel_tops(
        self, seed: Bytes
    ) -> arc4.StaticArray[arc4.UInt64, typing.Literal[5]]:
        """
        Get the top of each reel.
        """
        max_reel_stop = self._get_reel_length() - (
            self._get_reel_window_length() + UInt64(1)
        )
        top_1 = (
            arc4.UInt64.from_bytes(op.sha256(seed + Bytes(b"1"))[-8:]).native
            % max_reel_stop
        )
        top_2 = (
            arc4.UInt64.from_bytes(op.sha256(seed + Bytes(b"2"))[-8:]).native
            % max_reel_stop
        )
        top_3 = (
            arc4.UInt64.from_bytes(op.sha256(seed + Bytes(b"3"))[-8:]).native
            % max_reel_stop
        )
        top_4 = (
            arc4.UInt64.from_bytes(op.sha256(seed + Bytes(b"4"))[-8:]).native
            % max_reel_stop
        )
        top_5 = (
            arc4.UInt64.from_bytes(op.sha256(seed + Bytes(b"5"))[-8:]).native
            % max_reel_stop
        )
        return arc4.StaticArray(
            arc4.UInt64(top_1),
            arc4.UInt64(top_2),
            arc4.UInt64(top_3),
            arc4.UInt64(top_4),
            arc4.UInt64(top_5),
        )

    @arc4.abimethod(readonly=True)
    def get_seed_bet_grid(self, seed: Bytes32, bet_key: Bytes56) -> Bytes15:
        """
        Returns grid from seed and bet grid
        """
        ensure_budget(1000, OpUpFeeSource.GroupCredit)  # REM may use 1070 opcode budget
        combined = seed.bytes + bet_key.bytes
        hashed = op.sha256(combined)
        return Bytes15.from_bytes(self._get_grid(hashed))

    @arc4.abimethod(readonly=True)
    def get_grid(self, seed: Bytes32) -> Bytes15:
        """
        Get the grid of the slot machine.
        """
        ensure_budget(1000, OpUpFeeSource.GroupCredit)  # REM may use 1070 opcode budget
        return Bytes15.from_bytes(self._get_grid(seed.bytes))

    @subroutine
    def _get_grid(self, seed: Bytes) -> Bytes:
        """
        Get the grid of the slot machine.
        """
        reel_tops = self._get_reel_tops(seed)
        return (
            self._get_reel_window(UInt64(0), reel_tops[0].native)
            + self._get_reel_window(UInt64(1), reel_tops[1].native)
            + self._get_reel_window(UInt64(2), reel_tops[2].native)
            + self._get_reel_window(UInt64(3), reel_tops[3].native)
            + self._get_reel_window(UInt64(4), reel_tops[4].native)
        )

    @arc4.abimethod(readonly=True)
    def get_grid_payline_symbols(
        self, grid: Bytes15, payline_index: arc4.UInt64
    ) -> Bytes5:
        return Bytes5.from_bytes(
            self._get_grid_payline_symbols(grid.bytes, payline_index.native)
        )

    @subroutine
    def _get_grid_payline_symbols(self, grid: Bytes, payline_index: UInt64) -> Bytes:
        payline = self._get_payline(payline_index)
        symbols = arc4.StaticArray[arc4.Byte, typing.Literal[5]](
            arc4.Byte(0),
            arc4.Byte(0),
            arc4.Byte(0),
            arc4.Byte(0),
            arc4.Byte(0),
        )
        for i in urange(5):
            grid_index = i * UInt64(3) + payline[i].native
            symbols[i] = arc4.Byte.from_bytes(grid[grid_index : grid_index + 1])
        return symbols.bytes

    # --- Paylines ---

    @arc4.abimethod(readonly=True)
    def get_payline_count(self) -> arc4.UInt64:
        return arc4.UInt64(self._get_payline_count())

    @subroutine
    def _get_payline_count(self) -> UInt64:
        return Box(UInt64, key="payline_count").get(default=UInt64(20))

    @arc4.abimethod(readonly=True)
    def get_payline(
        self, payline_index: arc4.UInt64
    ) -> arc4.StaticArray[arc4.UInt64, typing.Literal[5]]:
        return self._get_payline(payline_index.native)

    @arc4.abimethod(readonly=True)
    def get_paylines(self) -> arc4.StaticArray[arc4.UInt64, typing.Literal[100]]:
        return self._get_paylines()

    @subroutine
    def _get_payline(
        self, index: UInt64
    ) -> arc4.StaticArray[arc4.UInt64, typing.Literal[5]]:
        paylines = self._get_paylines()
        start = index * UInt64(5)
        return arc4.StaticArray(
            paylines[start],
            paylines[start + UInt64(1)],
            paylines[start + UInt64(2)],
            paylines[start + UInt64(3)],
            paylines[start + UInt64(4)],
        )

    @subroutine
    def _get_paylines(
        self,
    ) -> arc4.StaticArray[arc4.UInt64, typing.Literal[100]]:
        return Box(
            arc4.StaticArray[arc4.UInt64, typing.Literal[100]],
            key="paylines",
        ).get(
            default=arc4.StaticArray(
                # 1. Middle line
                arc4.UInt64(1),
                arc4.UInt64(1),
                arc4.UInt64(1),
                arc4.UInt64(1),
                arc4.UInt64(1),
                # 2. Top line
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(0),
                # 3. Bottom line
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(2),
                # 4. V shape
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(1),
                arc4.UInt64(0),
                # 5. Inverted V
                arc4.UInt64(2),
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(2),
                # 6. Diagonal down
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(2),
                # 7. Diagonal up
                arc4.UInt64(2),
                arc4.UInt64(1),
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(0),
                # 8. Zigzag top
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(0),
                # 9. Zigzag bottom
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(2),
                # 10. Staircase down
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(1),
                # 11. Staircase up
                arc4.UInt64(2),
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(1),
                # 12. Slight diagonal
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(1),
                # 13. Slight diagonal
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(1),
                # 14. Top-bottom-top
                arc4.UInt64(0),
                arc4.UInt64(2),
                arc4.UInt64(0),
                arc4.UInt64(2),
                arc4.UInt64(0),
                # 15. Bottom-top-bottom
                arc4.UInt64(2),
                arc4.UInt64(0),
                arc4.UInt64(2),
                arc4.UInt64(0),
                arc4.UInt64(2),
                # 16. Outer rails up
                arc4.UInt64(0),
                arc4.UInt64(2),
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(0),
                # 17. Outer rails down
                arc4.UInt64(2),
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(2),
                # 18. Left hook
                arc4.UInt64(0),
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(2),
                # 19. Right hook
                arc4.UInt64(2),
                arc4.UInt64(2),
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(0),
                # 20. Wave
                arc4.UInt64(1),
                arc4.UInt64(0),
                arc4.UInt64(1),
                arc4.UInt64(2),
                arc4.UInt64(1),
            )
        )

    @arc4.abimethod(readonly=True)
    def match_payline(self, grid: Bytes15, payline_index: arc4.UInt64) -> PaylineMatch:
        """
        Match grid to payline by index

        Returns payline match
                count, number of consecutive matches on payline
                symbol, staring symbol
        """
        ensure_budget(700, OpUpFeeSource.GroupCredit)
        return self._match_payline(grid.bytes, payline_index.native)

    @subroutine
    def _match_payline(self, grid: Bytes, payline_index: UInt64) -> PaylineMatch:
        """
        Match a payline on the grid.
        Returns count of symbol occurrences in the payline.
        """

        symbol_A = Bytes(b"A")
        symbol_B = Bytes(b"B")
        symbol_C = Bytes(b"C")
        symbol_D = Bytes(b"D")

        count_A = UInt64(0)
        count_B = UInt64(0)
        count_C = UInt64(0)
        count_D = UInt64(0)

        highest_count = UInt64(0)
        highest_symbol = Bytes(b"_")
        highest_payout = UInt64(0)

        symbols = self._get_grid_payline_symbols(grid, payline_index)

        # Count all occurrences of the symbol in the payline
        for i in urange(5):
            current_symbol = symbols[i]
            if current_symbol == symbol_A:
                count_A += UInt64(1)
            elif current_symbol == symbol_B:
                count_B += UInt64(1)
            elif current_symbol == symbol_C:
                count_C += UInt64(1)
            elif current_symbol == symbol_D:
                count_D += UInt64(1)

        # determine the highest payout symbol

        m_highest_payout_a = self._get_payout_multiplier(
            PaylineMatch(
                count=arc4.UInt64(count_A),
                symbol=arc4.Byte.from_bytes(symbol_A),
            )
        )
        if m_highest_payout_a > highest_payout:
            highest_count = count_A
            highest_symbol = symbol_A
            highest_payout = m_highest_payout_a

        m_highest_payout_b = self._get_payout_multiplier(
            PaylineMatch(
                count=arc4.UInt64(count_B),
                symbol=arc4.Byte.from_bytes(symbol_B),
            )
        )
        if m_highest_payout_b > highest_payout:
            highest_count = count_B
            highest_symbol = symbol_B
            highest_payout = m_highest_payout_b

        m_highest_payout_c = self._get_payout_multiplier(
            PaylineMatch(
                count=arc4.UInt64(count_C),
                symbol=arc4.Byte.from_bytes(symbol_C),
            )
        )
        if m_highest_payout_c > highest_payout:
            highest_count = count_C
            highest_symbol = symbol_C
            highest_payout = m_highest_payout_c

        m_highest_payout_d = self._get_payout_multiplier(
            PaylineMatch(
                count=arc4.UInt64(count_D),
                symbol=arc4.Byte.from_bytes(symbol_D),
            )
        )
        if m_highest_payout_d > highest_payout:
            highest_count = count_D
            highest_symbol = symbol_D
            highest_payout = m_highest_payout_d

        return PaylineMatch(
            count=arc4.UInt64(highest_count),
            symbol=arc4.Byte.from_bytes(highest_symbol),
        )

    @arc4.abimethod
    def get_bet_grid(self, bet_key: Bytes56) -> Bytes15:
        ensure_budget(1000, OpUpFeeSource.GroupCredit)  # REM may use 1070 opcode budget
        return Bytes15.from_bytes(self._get_bet_grid(bet_key.bytes))

    @subroutine
    def _get_bet_grid(self, bet_key: Bytes) -> Bytes:
        assert bet_key in self.bet, "bet not found"
        bet = self.bet[bet_key].copy()
        combined = self._get_block_seed(bet.claim_round.native) + bet_key
        hashed = op.sha256(combined)
        grid = self._get_grid(hashed)
        return grid

    # override
    @arc4.abimethod
    def claim(self, bet_key: Bytes56) -> arc4.UInt64:
        """
        Claim all bets
        """
        ensure_budget(20000, OpUpFeeSource.GroupCredit)  # local program cost was 9787
        return arc4.UInt64(self._claim(bet_key.bytes))

    # override
    @subroutine
    def _claim(self, bet_key: Bytes) -> UInt64:
        """
        Claim all bets in spin
          1 get the box data
          a release lockup amount
          2 determine number of lines
          3 decode the entire grid
          4 loop through the number of lines and evaluate each one
          5 calculate payment out
          6 route payments
          b emit event
          7 close box
        """
        # 1 get the box data
        assert bet_key in self.bet, "bet not found"
        bet = self.bet[bet_key].copy()

        # a release lockup amount
        lockup_release = self._lockup_amount(bet.amount.native)
        self._decrement_balance_locked(lockup_release)
        self._increment_balance_available(lockup_release)

        # 2 determine number of lines
        lines = bet.max_payline_index.native + UInt64(1)
        # 3 decode the entire grid
        combined = self._get_block_seed(bet.claim_round.native) + bet_key
        hashed = op.sha256(combined)
        grid = self._get_grid(hashed)
        # 4 loop through the number of lines and evaluate each one
        total_payout = UInt64(0)
        for line_index in urange(lines):
            payline_match = self._match_payline(grid, line_index)
            # 5 calculate payment out
            payout = arc4.UInt64(
                bet.amount.native * self._get_payout_multiplier(payline_match)
            )
            # 6 route payments
            if payout.native > 0:
                total_payout += payout.native
                # itxn.Payment(receiver=bet.who.native, amount=payout.native).submit()
        # 7 close box
        del self.bet[bet_key]
        if total_payout > 0:
            itxn.Payment(receiver=bet.who.native, amount=total_payout).submit()
        itxn.Payment(
            receiver=Txn.sender,
            amount=self._spin_cost(),  # + self._spin_payline_cost(),
        ).submit()
        # b emit event
        arc4.emit(
            BetClaimed(
                who=bet.who,
                amount=bet.amount,
                max_payline_index=bet.max_payline_index,
                index=bet.index,
                claim_round=bet.claim_round,
                payout=arc4.UInt64(total_payout),
            )
        )
        return total_payout

    @subroutine
    def _get_block_seed(self, round: UInt64) -> Bytes:
        return op.Block.blk_seed(round)[-32:]

    @arc4.abimethod(readonly=True)
    def get_payout_multiplier(
        self, symbol: arc4.Byte, count: arc4.UInt64
    ) -> arc4.UInt64:
        return arc4.UInt64(
            self._get_payout_multiplier(PaylineMatch(count=count, symbol=symbol))
        )

    @subroutine
    def _get_payout_multiplier(self, pm: PaylineMatch) -> UInt64:
        """
        const PAYOUTS = {
            A: { 3: 200, 4: 1000, 5: 10000 },
            B: { 3: 60,  4: 200, 5: 1000 },
            C: { 3: 30,  4: 100, 5: 500 },
            D: { 3: 10,  4: 55,  5: 250 },
            _: {}
        };
        """
        if pm.symbol.bytes == Bytes(b"A"):
            if pm.count == UInt64(5):
                return UInt64(10000)
            elif pm.count == UInt64(4):
                return UInt64(1000)
            elif pm.count == UInt64(3):
                return UInt64(200)
            else:
                return UInt64(0)
        elif pm.symbol.bytes == Bytes(b"B"):
            if pm.count == UInt64(5):
                return UInt64(1000)
            elif pm.count == UInt64(4):
                return UInt64(200)
            elif pm.count == UInt64(3):
                return UInt64(60)
            else:
                return UInt64(0)
        elif pm.symbol.bytes == Bytes(b"C"):
            if pm.count == UInt64(5):
                return UInt64(500)
            elif pm.count == UInt64(4):
                return UInt64(100)
            elif pm.count == UInt64(3):
                return UInt64(30)
            else:
                return UInt64(0)
        elif pm.symbol.bytes == Bytes(b"D"):
            if pm.count == UInt64(5):
                return UInt64(250)
            elif pm.count == UInt64(4):
                return UInt64(55)
            elif pm.count == UInt64(3):
                return UInt64(10)
            else:
                return UInt64(0)
        else:  # _
            return UInt64(0)


# implements BootstrappedInterface
class YieldBearingToken(ARC200Token, Ownable, Upgradeable, Stakeable):
    """
    A simple yield bearing token
    """

    def __init__(self) -> None:
        # arc200 state
        self.name = String()
        self.symbol = String()
        self.decimals = UInt64()
        self.totalSupply = BigUInt()
        # upgradeable state
        self.upgrader = Global.creator_address
        self.contract_version = UInt64(0)
        self.deployment_version = UInt64(5)
        self.updatable = bool(1)
        # stakeable state
        self.delegate = Account()
        self.stakeable = bool(1)
        # yield bearing state
        self.bootstrap_active = bool()
        self.yield_bearing_source = UInt64()
        self.yield_fuse_active = bool(1)

    @arc4.abimethod
    def post_update(self) -> None:
        """
        Post upgrade
        """
        assert Txn.sender == self.upgrader, "must be upgrader"
        self.contract_version = UInt64(0)
        self.deployment_version = UInt64(5)

    @arc4.abimethod
    def bootstrap(self) -> None:
        """
        Bootstrap the contract
        """
        self._only_owner()
        assert self.bootstrap_active == bool(), "bootstrap is not active"
        # don't need to enforce payment here but reccommend that it is paid prior to
        # box creation ie depsoits
        self.decimals = UInt64(9)
        self.totalSupply = BigUInt(0)
        self.bootstrap_active = True

    @arc4.abimethod(readonly=True)
    def bootstrap_cost(self) -> arc4.UInt64:
        return arc4.UInt64(self._bootstrap_cost())

    @subroutine
    def _bootstrap_cost(self) -> UInt64:
        return Global.min_balance

    @subroutine
    def _get_length(self, bytes: Bytes) -> UInt64:
        i = UInt64(0)
        length = bytes.length
        while i < length:
            b = bytes[i]
            if b == Bytes.from_hex("00"):
                break
            i += 1
        return i

    @subroutine
    def _safe_slice(self, bytes: Bytes, max_length: UInt64) -> Bytes:
        length = self._get_length(bytes)
        return bytes if length >= max_length else bytes[:length]

    # allow owner to set name and symbol to avoid hardcoding

    # trimming string to not include null bytes is not required but improves ux in some
    # explorers that freak out about the null bytes

    @arc4.abimethod
    def set_name(self, name: Bytes32) -> None:
        """
        Set the name of the contract
        """
        self._only_owner()
        self.name = String.from_bytes(self._safe_slice(name.bytes, UInt64(32)))

    @arc4.abimethod
    def set_symbol(self, symbol: Bytes8) -> None:
        """
        Set the symbol of the contract
        """
        self._only_owner()
        self.symbol = String.from_bytes(self._safe_slice(symbol.bytes, UInt64(8)))

    # owner methods

    @arc4.abimethod
    def transfer_ownership(self, new_owner: arc4.Address) -> None:
        """
        Transfer the ownership of the contract
        """
        self._only_owner()
        self._transfer_ownership(new_owner.native)

    @arc4.abimethod
    def set_yield_bearing_source(self, app_id: arc4.UInt64) -> None:
        """
        Set the yield bearing source
        """
        self._only_owner()
        assert self.yield_fuse_active == bool(1), "yield fuse is not active"
        app = Application(app_id.native)
        owner, txn = arc4.abi_call(
            OwnableInterface.get_owner,
            app_id=app,
        )
        assert (
            owner.native == Global.current_application_address
        ), "yield bearing source must be owned by this contract"
        self.yield_bearing_source = app_id.native

    @arc4.abimethod
    def revoke_yield_bearing_source(self, new_owner: arc4.Address) -> None:
        """
        Revoke the yield bearing source by transferring ownership to a new owner
        """
        self._only_owner()
        assert self.yield_bearing_source > 0, "yield bearing source not set"
        arc4.abi_call(
            Ownable.transfer_ownership,
            new_owner,
            app_id=Application(self.yield_bearing_source),
        )

    @arc4.abimethod
    def burn_yield_fuse(self) -> None:
        """
        Burn the yield fuse
        """
        self._only_owner()
        assert self.yield_fuse_active == bool(1), "yield fuse is not active"
        self.yield_fuse_active = False

    @arc4.abimethod
    def burn_stakeable_fuse(self) -> None:
        """
        Burn the stakeable fuse
        """
        self._only_owner()
        self.stakeable = False

    @arc4.abimethod
    def burn_upgradeable_fuse(self) -> None:
        """
        Burn the upgradeable fuse
        """
        self._only_owner()
        self.updatable = False

    @subroutine
    def _get_yield_bearing_source_balance(self) -> UInt64:
        """
        Get the total balance of the yield bearing source.
        Used for share calculation during deposits to represent the actual
        underlying assets backing the yield-bearing tokens.
        """
        total_balance, txn = arc4.abi_call(
            BankManagerInterface.get_balance_total,
            app_id=Application(self.yield_bearing_source),
        )
        return total_balance.native

    @arc4.abimethod
    def deposit(self) -> arc4.UInt256:
        """
        Deposit funds into the yield-bearing token contract.

        This method accepts a payment from the sender, forwards the deposit amount
        to the yield-bearing source (slot machine), and mints shares proportional
        to the underlying assets. New users pay for balance box storage costs.

        The share calculation uses the total assets balance from BEFORE the deposit
        to prevent share inflation from the user's own deposit.

        Args:
            None (payment is extracted from the transaction)

        Returns:
            arc4.UInt256: The number of shares minted to the sender

        Raises:
            AssertionError: If yield bearing source is not set
            AssertionError: If payment is insufficient to cover box costs
            AssertionError: If calculated deposit amount is zero or negative

        Note:
            - First-time depositors pay for balance box storage (28500 microAlgos)
            - Existing users only pay for the actual deposit amount
            - Shares are minted based on the ratio of deposit to total assets
        """
        # Validate inputs
        assert self.yield_bearing_source > 0, "yield bearing source not set"

        # Check payment
        payment = require_payment(Txn.sender)
        balance_box_cost = self._deposit_cost()
        assert payment >= balance_box_cost, "payment insufficient"
        deposit_amount = (
            payment if self._has_balance(Txn.sender) else payment - balance_box_cost
        )
        assert deposit_amount > 0, "deposit amount must be greater than 0"

        # Query balance BEFORE forwarding deposit
        total_assets = self._get_yield_bearing_source_balance()

        # Forward to yield source
        app = Application(self.yield_bearing_source)
        itxn.Payment(receiver=app.address, amount=deposit_amount).submit()

        # Call owner_deposit (ensure this contract is owner)
        arc4.abi_call(
            SlotMachine.owner_deposit,
            arc4.UInt64(deposit_amount),
            app_id=app,
        )

        # Mint shares based on PRIOR balance (not inflated balance)
        return arc4.UInt256(self._mint(BigUInt(deposit_amount), total_assets))

    @arc4.abimethod
    def deposit_cost(self) -> arc4.UInt64:
        return arc4.UInt64(self._deposit_cost())

    @subroutine
    def _deposit_cost(self) -> UInt64:
        return (
            UInt64(BOX_COST_BALANCE) if not self._has_balance(Txn.sender) else UInt64(0)
        )

    @subroutine
    def _has_balance(self, who: Account) -> bool:
        """
        Check if an account has a balance greater than 0.

        This method uses a sentinel value (totalSupply + 1) to detect if a balance
        exists in the BoxMap. Since no valid balance can exceed totalSupply, this
        sentinel value will never collide with actual balances.
        """
        return self.balances.get(
            key=who, default=self.totalSupply + BigUInt(1)
        ) != self.totalSupply + BigUInt(1)

    @subroutine
    def _mint(self, amount: BigUInt, total_assets: UInt64) -> BigUInt:
        """
        Mint yield-bearing tokens (shares) proportional to the deposit amount.

        This method calculates the number of shares to mint based on the ratio of
        the deposit amount to the total assets in the yield-bearing source. The
        calculation uses a scaling factor to maintain precision during integer
        division operations.

        Args:
            amount: The deposit amount in atomic units (e.g., microAlgos)
            total_assets: The total assets in the yield-bearing source before this deposit

        Returns:
            BigUInt: The number of shares minted to the sender

        Note:
            - For the first deposit (when totalSupply == 0), shares = amount
            - For subsequent deposits, shares = (amount * totalSupply * SCALING_FACTOR) / (total_assets * SCALING_FACTOR)
            - The scaling factor (10^12) prevents precision loss during integer division
            - This ensures fair share distribution regardless of deposit size
        """
        # If no shares, mint the full amount
        # Else use total_assets instead of querying current balance
        shares = (
            amount
            if self.totalSupply == 0
            else (amount * self.totalSupply * SCALING_FACTOR)
            // (BigUInt(total_assets) * SCALING_FACTOR)
        )
        # REM make sure not to multiple total_assets and SCALING_FACTOR
        # because it will overflow
        # Ensure minimum shares are minted to prevent dust deposits
        assert shares > 0, "Deposit amount too small"
        # Update state
        self.totalSupply += shares
        self.balances[Txn.sender] = self._balanceOf(Txn.sender) + shares
        # Emit event
        arc4.emit(
            arc200_Transfer(
                arc4.Address(Global.zero_address),
                arc4.Address(Txn.sender),
                arc4.UInt256(shares),
            )
        )
        return shares

    @arc4.abimethod(readonly=True)
    def get_max_withdrawable_amount(self, who: arc4.Address) -> arc4.UInt256:
        return arc4.UInt256(self._get_max_withdrawable_amount(who.native))

    @subroutine
    def _get_max_withdrawable_amount(self, who: Account) -> BigUInt:
        balance = self._balanceOf(who)
        if balance == 0:
            return BigUInt(0)

        # Get available and locked balances from yield bearing source
        app = Application(self.yield_bearing_source)
        available_balance, txn1 = arc4.abi_call(
            BankManagerInterface.get_balance_available,
            app_id=app,
        )
        locked_balance, txn2 = arc4.abi_call(
            BankManagerInterface.get_balance_locked,
            app_id=app,
        )
        # Calculate the maximum withdrawable amount based on available/locked ratio
        total_balance = available_balance.native + locked_balance.native
        if total_balance == 0:
            return BigUInt(0)

        # Calculate how much of the user's requested amount can actually be withdrawn
        # based on the proportion of available balance
        # Use scaling factor to maintain precision in integer arithmetic
        max_withdrawable = (
            balance * BigUInt(available_balance.native) * SCALING_FACTOR
        ) // (BigUInt(total_balance) * SCALING_FACTOR)
        return max_withdrawable

    @arc4.abimethod
    def withdraw(self, amount: arc4.UInt256) -> arc4.UInt64:
        """
        Withdraw funds from the contract.
        The actual withdrawal amount is limited by the ratio of available to locked balances
        in the yield bearing source. If all funds are available, the full amount can be withdrawn.
        """
        assert amount.native > 0, "amount must be greater than 0"
        assert self.yield_bearing_source > 0, "yield bearing source not set"

        max_withdrawable = self._get_max_withdrawable_amount(Txn.sender)
        assert max_withdrawable >= amount.native, "insufficient balance"

        # burn shares for underlying assets
        return arc4.UInt64(self._burn(amount.native))

    @subroutine
    def _burn(self, withdraw_amount: BigUInt) -> UInt64:
        """
        Burn tokens (shares) based on the proportion of assets being withdrawn
        """
        # Get total balance of yield bearing source
        app = Application(self.yield_bearing_source)
        total_balance, txn1 = arc4.abi_call(
            BankManagerInterface.get_balance_total,
            app_id=app,
        )
        # Have total balance to calculate the amount of shares to burn
        big_slot_machine_balance = BigUInt(total_balance.native)

        # Calculate withdrawal amount with increased precision
        amount_to_withdraw = (
            (withdraw_amount * big_slot_machine_balance * SCALING_FACTOR)
            // self.totalSupply
        ) // SCALING_FACTOR

        # Verify amount conversion
        small_amount_to_withdraw = arc4.UInt64.from_bytes(
            arc4.UInt256(amount_to_withdraw).bytes[-8:]
        ).native
        assert small_amount_to_withdraw > 0, "amount to withdraw is 0"

        # Update balances first
        self.balances[Txn.sender] -= withdraw_amount
        self.totalSupply -= withdraw_amount

        # Make external calls after state updates
        app = Application(self.yield_bearing_source)
        arc4.abi_call(
            SlotMachine.withdraw,
            amount_to_withdraw,
            app_id=app,
        )
        itxn.Payment(receiver=Txn.sender, amount=small_amount_to_withdraw).submit()

        # Emit event
        arc4.emit(
            arc200_Transfer(
                arc4.Address(Txn.sender),
                arc4.Address(Global.zero_address),
                arc4.UInt256(withdraw_amount),
            )
        )
        return small_amount_to_withdraw
