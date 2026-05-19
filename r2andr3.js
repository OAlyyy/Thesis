// ─────────────────────────────────────────────────────────────
// ROUND 2 CONTRACTS  (E, F, G, H)
// E: TokenBalance       — small, no proxy
// F: TokenBalance+Proxy — small, with proxy
// G: EscrowSystem       — large, no proxy
// H: EscrowSystem+Proxy — large, with proxy
// ─────────────────────────────────────────────────────────────

export const contractsRound2 = {

  E: {
    id: 'E',
    label: 'Contract E — Simple, No Proxy',
    timerSeconds: 400,
    // Ordering: compound names before roots (deposit, withdraw, getBalance before balance)
    variants: [
      { TokenBalance: 'CreditLedger',  deposit: 'addCredit',   withdraw: 'removeCredit', getBalance: 'checkCredit',  balance: 'credit'   },
      { TokenBalance: 'FundTracker',   deposit: 'addFunds',    withdraw: 'removeFunds',  getBalance: 'viewFunds',    balance: 'funds'    },
      { TokenBalance: 'PointsStore',   deposit: 'earnPoints',  withdraw: 'spendPoints',  getBalance: 'totalPoints',  balance: 'points'   },
    ],
    code: `pragma solidity ^0.8.0;

contract TokenBalance {
    mapping(address => uint256) private balance;

    function deposit(uint256 amount) public {
        balance[msg.sender] += amount;
    }

    function withdraw(uint256 amount) public {
        require(balance[msg.sender] >= amount, "Insufficient balance");
        balance[msg.sender] -= amount;
    }

    function getBalance(address account) public view returns (uint256) {
        return balance[account];
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract do? Describe in 1-2 sentences.',
        correctAnswer: 'TokenBalance tracks a uint256 balance for each address using a mapping. Any address can deposit or withdraw from their own balance, and anyone can query any address\'s balance.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'If you call deposit(), which contract executes the logic?',
        options: ['TokenBalance directly', 'A separate implementation contract', 'I am not sure'],
        correctAnswer: 'TokenBalance directly',
        explanation: 'There is no proxy. Calls go directly to TokenBalance which executes the logic itself.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the balance mapping stored?',
        options: ['In TokenBalance', 'In a separate contract', 'I am not sure'],
        correctAnswer: 'In TokenBalance',
        explanation: 'Without a proxy, state is stored in the contract that declares it — TokenBalance.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'What happens if an address tries to withdraw more than their balance? Explain why.',
        correctAnswer: 'The transaction reverts with "Insufficient balance". The require statement checks that balance[msg.sender] >= amount before proceeding, and reverts if the condition is false.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Can address A withdraw funds that were deposited by address B? Why or why not?',
        correctAnswer: 'No. The deposit function adds to balance[msg.sender], so deposits are tied to the caller\'s address. The withdraw function also deducts from balance[msg.sender], so each address can only withdraw their own balance.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'What happens to all balances if the contract is redeployed at a new address?',
        options: [
          'Balances are copied to the new contract',
          'Balances are lost, the new contract starts with an empty mapping',
          'Balances are stored permanently on the blockchain regardless of address',
          'I am not sure',
        ],
        correctAnswer: 'Balances are lost, the new contract starts with an empty mapping',
        explanation: 'State is tied to a specific contract address. A redeployment creates a new contract with empty storage — no data is migrated automatically.',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

  F: {
    id: 'F',
    label: 'Contract F — Simple, With Proxy',
    timerSeconds: 400,
    // Ordering: compound names before roots
    variants: [
      { TokenBalanceV2: 'CreditLedgerV2',  BalanceProxy: 'CreditForwarder',  deposit: 'addCredit',   withdraw: 'removeCredit', getBalance: 'checkCredit',  implementation: 'target',   balance: 'credit'  },
      { TokenBalanceV2: 'FundTrackerV2',   BalanceProxy: 'FundDispatcher',   deposit: 'addFunds',    withdraw: 'removeFunds',  getBalance: 'viewFunds',    implementation: 'delegate', balance: 'funds'   },
      { TokenBalanceV2: 'PointsStoreV2',   BalanceProxy: 'PointsGateway',    deposit: 'earnPoints',  withdraw: 'spendPoints',  getBalance: 'totalPoints',  implementation: 'backend',  balance: 'points'  },
    ],
    code: `pragma solidity ^0.8.0;

contract TokenBalanceV2 {
    mapping(address => uint256) private balance;

    function deposit(uint256 amount) public {
        balance[msg.sender] += amount;
    }

    function withdraw(uint256 amount) public {
        require(balance[msg.sender] >= amount, "Insufficient balance");
        balance[msg.sender] -= amount;
    }

    function getBalance(address account) public view returns (uint256) {
        return balance[account];
    }
}

contract BalanceProxy {
    address public implementation;

    constructor(address _implementation) {
        implementation = _implementation;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract system do? Describe in 1-2 sentences.',
        correctAnswer: 'The system uses a BalanceProxy that forwards all calls via delegatecall to TokenBalanceV2. This allows the balance logic to be upgraded while keeping the same proxy address and preserving all stored balances.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'If you call deposit() through the proxy, which contract executes the logic?',
        options: [
          'BalanceProxy forwards the call to TokenBalanceV2',
          'TokenBalanceV2 directly',
          'I am not sure',
        ],
        correctAnswer: 'BalanceProxy forwards the call to TokenBalanceV2',
        explanation: 'BalanceProxy has a fallback function that uses delegatecall to forward every call to the implementation contract (TokenBalanceV2).',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the balance mapping stored?',
        options: ['In TokenBalanceV2', 'In BalanceProxy', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In BalanceProxy',
        explanation: 'delegatecall executes TokenBalanceV2\'s code in the storage context of BalanceProxy. All state, including the balance mapping, lives in BalanceProxy\'s storage.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If the implementation is upgraded to a new address, what happens to all existing balances? Explain why.',
        correctAnswer: 'All balances are preserved. Because the balance mapping is stored in BalanceProxy\'s storage (not in TokenBalanceV2), pointing the proxy at a new implementation does not change the proxy\'s storage slots.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Which contract would you audit to check for security issues, BalanceProxy or TokenBalanceV2? Explain your reasoning.',
        correctAnswer: 'Both need auditing. TokenBalanceV2 contains the business logic executed via delegatecall, so any bugs there directly affect the system. BalanceProxy controls the implementation pointer, so an unrestricted upgrade or storage collision is also a critical attack surface.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'If address A calls deposit(100) through BalanceProxy, where is the value 100 added?',
        options: ['To balance[A] in TokenBalanceV2', 'To balance[A] in BalanceProxy', 'To both contracts', 'I am not sure'],
        correctAnswer: 'To balance[A] in BalanceProxy',
        explanation: 'delegatecall runs TokenBalanceV2\'s code inside BalanceProxy\'s storage context. All writes, including the balance update, happen in BalanceProxy\'s storage.',
      },
      {
        id: 'q7',
        type: 'text',
        prompt: 'If you only had access to BalanceProxy\'s code, could you determine what deposit() does? Explain.',
        correctAnswer: 'No. BalanceProxy blindly forwards calls via delegatecall without knowing the ABI or logic of the implementation. You would need TokenBalanceV2\'s code to understand what deposit() actually does.',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

  G: {
    id: 'G',
    label: 'Contract G — Complex, No Proxy',
    timerSeconds: 600,
    // Ordering: compound names before roots (releaseFunds before funds; confirmDelivery before delivery)
    variants: [
      { EscrowSystem: 'PaymentHold',   releaseFunds: 'releasePay',    refundBuyer: 'refundPurchaser', confirmDelivery: 'confirmReceipt', depositor: 'payer',   beneficiary: 'payee',     arbiter: 'mediator',  isComplete: 'paymentDone',   isRefunded: 'refundIssued', amount: 'payment'  },
      { EscrowSystem: 'TradeEscrow',   releaseFunds: 'releaseTrade',  refundBuyer: 'refundTrader',   confirmDelivery: 'confirmTrade',   depositor: 'buyer',   beneficiary: 'seller',    arbiter: 'judge',     isComplete: 'tradeComplete', isRefunded: 'tradeCancelled', amount: 'tradeAmount' },
      { EscrowSystem: 'ServiceLock',   releaseFunds: 'releasePayment',refundBuyer: 'refundClient',   confirmDelivery: 'approveService', depositor: 'client',  beneficiary: 'provider',  arbiter: 'resolver',  isComplete: 'serviceApproved', isRefunded: 'clientRefunded', amount: 'fee' },
    ],
    code: `pragma solidity ^0.8.0;

contract EscrowSystem {
    address public depositor;
    address public beneficiary;
    address public arbiter;
    uint256 public amount;
    bool public isComplete;
    bool public isRefunded;

    constructor(address _beneficiary, address _arbiter) {
        depositor = msg.sender;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
        amount = 0;
        isComplete = false;
        isRefunded = false;
    }

    function deposit() public payable {
        require(msg.sender == depositor, "Not depositor");
        require(!isComplete && !isRefunded, "Escrow closed");
        amount += msg.value;
    }

    function confirmDelivery() public {
        require(msg.sender == depositor, "Not depositor");
        require(!isComplete && !isRefunded, "Escrow closed");
        isComplete = true;
        releaseFunds();
    }

    function releaseFunds() internal {
        payable(beneficiary).transfer(amount);
    }

    function refundBuyer() public {
        require(msg.sender == arbiter, "Not arbiter");
        require(!isComplete && !isRefunded, "Escrow closed");
        isRefunded = true;
        payable(depositor).transfer(amount);
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract do? Describe in 1-2 sentences.',
        correctAnswer: 'EscrowSystem holds funds deposited by a depositor until the depositor confirms delivery, at which point the funds are released to the beneficiary. If there is a dispute, the arbiter can refund the depositor instead.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'Who is allowed to call confirmDelivery()?',
        options: [
          'Only the depositor',
          'Only the arbiter',
          'Only the beneficiary',
          'I am not sure',
        ],
        correctAnswer: 'Only the depositor',
        explanation: 'confirmDelivery() has require(msg.sender == depositor), so only the address that deployed the contract and was assigned as depositor can call it.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'What happens if the arbiter calls refundBuyer() after confirmDelivery() has already been called?',
        options: [
          'The depositor receives a second refund',
          'The transaction reverts',
          'The beneficiary loses the funds',
          'I am not sure',
        ],
        correctAnswer: 'The transaction reverts',
        explanation: 'refundBuyer() has require(!isComplete && !isRefunded). Once confirmDelivery() sets isComplete to true, this condition fails and the transaction reverts.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'Can the depositor get their money back without the arbiter? Why or why not?',
        correctAnswer: 'No. The only way funds return to the depositor is through refundBuyer(), which requires msg.sender == arbiter. The depositor cannot trigger a refund directly.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Where is the deposited ether stored, and who controls when it moves?',
        correctAnswer: 'The ether is stored in the EscrowSystem contract\'s own balance (via msg.value in deposit()). It can only move when the depositor calls confirmDelivery() (to the beneficiary) or when the arbiter calls refundBuyer() (back to the depositor).',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

  H: {
    id: 'H',
    label: 'Contract H — Complex, With Proxy',
    timerSeconds: 600,
    // Ordering: compound names before roots
    variants: [
      { EscrowSystemV2: 'PaymentHoldV2',  EscrowProxy: 'PaymentForwarder', releaseFunds: 'releasePay',     refundBuyer: 'refundPurchaser', confirmDelivery: 'confirmReceipt', upgradeTo: 'updateLogic',  implementation: 'logicContract', depositor: 'payer',  beneficiary: 'payee',    arbiter: 'mediator', isComplete: 'paymentDone',    isRefunded: 'refundIssued',   amount: 'payment'     },
      { EscrowSystemV2: 'TradeEscrowV2',  EscrowProxy: 'TradeForwarder',   releaseFunds: 'releaseTrade',   refundBuyer: 'refundTrader',   confirmDelivery: 'confirmTrade',   upgradeTo: 'setLogic',     implementation: 'logicAddress',  depositor: 'buyer',  beneficiary: 'seller',   arbiter: 'judge',    isComplete: 'tradeComplete',  isRefunded: 'tradeCancelled', amount: 'tradeAmount'  },
      { EscrowSystemV2: 'ServiceLockV2',  EscrowProxy: 'ServiceForwarder', releaseFunds: 'releasePayment', refundBuyer: 'refundClient',   confirmDelivery: 'approveService', upgradeTo: 'pointTo',      implementation: 'logicTarget',   depositor: 'client', beneficiary: 'provider', arbiter: 'resolver', isComplete: 'serviceApproved',isRefunded: 'clientRefunded', amount: 'fee'          },
    ],
    code: `pragma solidity ^0.8.0;

contract EscrowSystemV2 {
    address public depositor;
    address public beneficiary;
    address public arbiter;
    uint256 public amount;
    bool public isComplete;
    bool public isRefunded;

    function initialize(address _beneficiary, address _arbiter) public {
        depositor = msg.sender;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
        isComplete = false;
        isRefunded = false;
    }

    function deposit() public payable {
        require(msg.sender == depositor, "Not depositor");
        require(!isComplete && !isRefunded, "Escrow closed");
        amount += msg.value;
    }

    function confirmDelivery() public {
        require(msg.sender == depositor, "Not depositor");
        require(!isComplete && !isRefunded, "Escrow closed");
        isComplete = true;
        releaseFunds();
    }

    function releaseFunds() internal {
        payable(beneficiary).transfer(amount);
    }

    function refundBuyer() public {
        require(msg.sender == arbiter, "Not arbiter");
        require(!isComplete && !isRefunded, "Escrow closed");
        isRefunded = true;
        payable(depositor).transfer(amount);
    }
}

contract EscrowProxy {
    address public implementation;
    address public owner;

    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }

    function upgradeTo(address _newImplementation) public {
        require(msg.sender == owner, "Not owner");
        implementation = _newImplementation;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract system do? Describe in 1-2 sentences.',
        correctAnswer: 'The system is an upgradeable escrow. EscrowProxy holds all state and forwards calls to EscrowSystemV2 via delegatecall; the owner can upgrade the logic by pointing the proxy at a new implementation.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'When the depositor calls confirmDelivery() on EscrowProxy, which contract executes the logic?',
        options: [
          'EscrowProxy directly',
          'EscrowSystemV2 via delegatecall',
          'A new contract is created each time',
          'I am not sure',
        ],
        correctAnswer: 'EscrowSystemV2 via delegatecall',
        explanation: 'EscrowProxy\'s fallback uses delegatecall to run EscrowSystemV2\'s code in the proxy\'s storage context.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where are the escrow state variables (depositor, amount, isComplete) stored?',
        options: ['In EscrowSystemV2', 'In EscrowProxy', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In EscrowProxy',
        explanation: 'delegatecall executes EscrowSystemV2\'s code but writes to EscrowProxy\'s storage. All state — including depositor, amount, and isComplete — lives in EscrowProxy.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If the owner calls upgradeTo() with a new implementation, what happens to the existing escrow state? Explain why.',
        correctAnswer: 'All state (depositor, beneficiary, arbiter, amount, isComplete, isRefunded) is preserved. The state lives in EscrowProxy\'s storage, not in EscrowSystemV2. Changing the implementation pointer does not affect the proxy\'s storage slots.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Which contract would you audit for security issues, EscrowProxy or EscrowSystemV2? Explain your reasoning.',
        correctAnswer: 'Both. EscrowSystemV2 contains the escrow logic executed via delegatecall — bugs in deposit, confirmDelivery, or refundBuyer directly affect funds. EscrowProxy controls upgrades and storage layout — an unrestricted upgradeTo() or storage collision could drain funds or corrupt state.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'Can the EscrowProxy owner upgrade the logic while an escrow is in progress?',
        options: [
          'No, upgrades are blocked once a deposit has been made',
          'Yes, upgradeTo() has no restrictions beyond the owner check',
          'Only the arbiter can approve an upgrade',
          'I am not sure',
        ],
        correctAnswer: 'Yes, upgradeTo() has no restrictions beyond the owner check',
        explanation: 'upgradeTo() only checks require(msg.sender == owner). There is no check on isComplete, amount, or any other escrow state. The owner can upgrade at any time.',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

};

// ─────────────────────────────────────────────────────────────
// ROUND 3 CONTRACTS  (I, J, K, L)
// I: AccessControl        — small, no proxy
// J: AccessControl+Proxy  — small, with proxy
// K: AuctionSystem        — large, no proxy
// L: AuctionSystem+Proxy  — large, with proxy
// ─────────────────────────────────────────────────────────────

export const contractsRound3 = {

  I: {
    id: 'I',
    label: 'Contract I — Simple, No Proxy',
    timerSeconds: 400,
    // Ordering: hasRole, grantRole, revokeRole before role; isAdmin before admin
    variants: [
      { AccessControl: 'PermissionStore', hasRole: 'checkPermission', grantRole: 'addPermission',  revokeRole: 'removePermission', isAdmin: 'isOwner',  admin: 'owner',    role: 'permission'  },
      { AccessControl: 'RoleRegistry',    hasRole: 'isAuthorised',    grantRole: 'authorise',       revokeRole: 'deauthorise',      isAdmin: 'isManager',admin: 'manager',  role: 'authorised'  },
      { AccessControl: 'MemberList',      hasRole: 'isMember',        grantRole: 'addMember',       revokeRole: 'removeMember',     isAdmin: 'isChair',  admin: 'chair',    role: 'membership'  },
    ],
    code: `pragma solidity ^0.8.0;

contract AccessControl {
    address public admin;
    mapping(address => bool) public hasRole;

    constructor() {
        admin = msg.sender;
        hasRole[msg.sender] = true;
    }

    function grantRole(address account) public {
        require(msg.sender == admin, "Not admin");
        hasRole[account] = true;
    }

    function revokeRole(address account) public {
        require(msg.sender == admin, "Not admin");
        hasRole[account] = false;
    }

    function isAdmin(address account) public view returns (bool) {
        return account == admin;
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract do? Describe in 1-2 sentences.',
        correctAnswer: 'AccessControl manages a simple role system where the deployer becomes the admin and can grant or revoke a boolean role for any address. The admin themselves is automatically granted the role on deployment.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'If you call grantRole(), which contract executes the logic?',
        options: ['AccessControl directly', 'A separate implementation contract', 'I am not sure'],
        correctAnswer: 'AccessControl directly',
        explanation: 'There is no proxy. Calls go directly to AccessControl which executes the logic itself.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the hasRole mapping stored?',
        options: ['In AccessControl', 'In a separate contract', 'I am not sure'],
        correctAnswer: 'In AccessControl',
        explanation: 'Without a proxy, state is stored in the contract that declares it — AccessControl.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'Can a non-admin address grant a role to someone else? Explain why.',
        correctAnswer: 'No. Both grantRole() and revokeRole() have require(msg.sender == admin). Only the admin address can change role assignments.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'What is the difference between hasRole and isAdmin in this contract?',
        correctAnswer: 'hasRole is a mapping that tracks which addresses have been granted the role — it can include multiple addresses. isAdmin is a view function that checks whether a specific address is the admin (the single deployer). The admin always has the role, but role holders are not necessarily the admin.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'Can the admin revoke their own role?',
        options: [
          'Yes, revokeRole() can be called with the admin\'s own address',
          'No, the contract prevents the admin from revoking themselves',
          'I am not sure',
        ],
        correctAnswer: 'Yes, revokeRole() can be called with the admin\'s own address',
        explanation: 'revokeRole() only checks require(msg.sender == admin) — there is no restriction on which address is passed as the account parameter. The admin could revoke their own role from the hasRole mapping.',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

  J: {
    id: 'J',
    label: 'Contract J — Simple, With Proxy',
    timerSeconds: 400,
    // Ordering: compound names before roots
    variants: [
      { AccessControlV2: 'PermissionStoreV2', AccessProxy: 'PermissionForwarder', hasRole: 'checkPermission', grantRole: 'addPermission',  revokeRole: 'removePermission', isAdmin: 'isOwner',   upgradeTo: 'updateLogic',  implementation: 'logicContract', admin: 'owner',   role: 'permission' },
      { AccessControlV2: 'RoleRegistryV2',    AccessProxy: 'RoleForwarder',        hasRole: 'isAuthorised',    grantRole: 'authorise',       revokeRole: 'deauthorise',      isAdmin: 'isManager', upgradeTo: 'setLogic',     implementation: 'logicAddress',  admin: 'manager', role: 'authorised' },
      { AccessControlV2: 'MemberListV2',      AccessProxy: 'MemberForwarder',      hasRole: 'isMember',        grantRole: 'addMember',       revokeRole: 'removeMember',     isAdmin: 'isChair',   upgradeTo: 'pointTo',      implementation: 'logicTarget',   admin: 'chair',   role: 'membership' },
    ],
    code: `pragma solidity ^0.8.0;

contract AccessControlV2 {
    address public admin;
    mapping(address => bool) public hasRole;

    function initialize() public {
        admin = msg.sender;
        hasRole[msg.sender] = true;
    }

    function grantRole(address account) public {
        require(msg.sender == admin, "Not admin");
        hasRole[account] = true;
    }

    function revokeRole(address account) public {
        require(msg.sender == admin, "Not admin");
        hasRole[account] = false;
    }

    function isAdmin(address account) public view returns (bool) {
        return account == admin;
    }
}

contract AccessProxy {
    address public implementation;
    address public owner;

    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }

    function upgradeTo(address _newImplementation) public {
        require(msg.sender == owner, "Not owner");
        implementation = _newImplementation;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract system do? Describe in 1-2 sentences.',
        correctAnswer: 'The system is an upgradeable access control contract. AccessProxy holds all state and forwards calls to AccessControlV2 via delegatecall; the proxy owner can upgrade the logic by pointing at a new implementation.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'If you call grantRole() through AccessProxy, which contract executes the logic?',
        options: [
          'AccessProxy forwards the call to AccessControlV2',
          'AccessControlV2 directly',
          'I am not sure',
        ],
        correctAnswer: 'AccessProxy forwards the call to AccessControlV2',
        explanation: 'AccessProxy\'s fallback function uses delegatecall to forward every call to the implementation contract (AccessControlV2).',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the hasRole mapping stored?',
        options: ['In AccessControlV2', 'In AccessProxy', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In AccessProxy',
        explanation: 'delegatecall executes AccessControlV2\'s code in AccessProxy\'s storage context. All state, including hasRole, lives in AccessProxy\'s storage.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If the proxy is upgraded to a new implementation, what happens to existing role assignments? Explain why.',
        correctAnswer: 'All role assignments are preserved. The hasRole mapping lives in AccessProxy\'s storage, not in AccessControlV2. Changing the implementation pointer does not affect the proxy\'s storage.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'There are two "owner"-like addresses in this system. What are they and what do they each control?',
        correctAnswer: 'AccessProxy.owner is the proxy\'s own owner and controls who can call upgradeTo() to change the implementation. AccessControlV2.admin (stored in the proxy\'s storage) is the access control admin who controls grantRole() and revokeRole(). They are separate roles with separate responsibilities.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'If someone calls grantRole() directly on AccessControlV2 (not through the proxy), where does the change take effect?',
        options: [
          'In AccessProxy\'s hasRole mapping',
          'In AccessControlV2\'s own storage',
          'In both',
          'I am not sure',
        ],
        correctAnswer: 'In AccessControlV2\'s own storage',
        explanation: 'Calling AccessControlV2 directly (not via delegatecall through the proxy) runs the code in AccessControlV2\'s own storage context. This would modify AccessControlV2\'s storage, which is separate from AccessProxy\'s storage. The proxy would be unaffected.',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

  K: {
    id: 'K',
    label: 'Contract K — Complex, No Proxy',
    timerSeconds: 600,
    // Ordering: compound names before roots (highestBidder, highestBid, endAuction, placeBid, withdrawBid before bid)
    variants: [
      { AuctionSystem: 'SaleContract',   highestBidder: 'topBuyer',    highestBid: 'topOffer',   endAuction: 'closeSale',   placeBid: 'submitOffer', withdrawBid: 'reclaimOffer', auctionEnd: 'saleDeadline', auctionEnded: 'saleClosed', seller: 'vendor',  bids: 'offers'   },
      { AuctionSystem: 'BidVault',       highestBidder: 'leadBidder',  highestBid: 'leadAmount', endAuction: 'finalise',    placeBid: 'enterBid',    withdrawBid: 'pullBid',      auctionEnd: 'closeTime',    auctionEnded: 'vaultClosed',seller: 'auctioneer', bids: 'entries' },
      { AuctionSystem: 'TenderManager',  highestBidder: 'topTenderer', highestBid: 'topTender',  endAuction: 'closeTender', placeBid: 'submitTender',withdrawBid: 'reclaimTender',auctionEnd: 'tenderClose',  auctionEnded: 'tenderClosed', seller: 'issuer', bids: 'tenders' },
    ],
    code: `pragma solidity ^0.8.0;

contract AuctionSystem {
    address public seller;
    address public highestBidder;
    uint256 public highestBid;
    uint256 public auctionEnd;
    bool public auctionEnded;
    mapping(address => uint256) public bids;

    constructor(uint256 durationSeconds) {
        seller = msg.sender;
        auctionEnd = block.timestamp + durationSeconds;
        auctionEnded = false;
    }

    function placeBid() public payable {
        require(block.timestamp < auctionEnd, "Auction ended");
        require(msg.value > highestBid, "Bid too low");
        if (highestBidder != address(0)) {
            bids[highestBidder] += highestBid;
        }
        highestBidder = msg.sender;
        highestBid = msg.value;
    }

    function withdrawBid() public {
        uint256 amount = bids[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        bids[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function endAuction() public {
        require(block.timestamp >= auctionEnd, "Auction not ended");
        require(!auctionEnded, "Already ended");
        auctionEnded = true;
        payable(seller).transfer(highestBid);
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract do? Describe in 1-2 sentences.',
        correctAnswer: 'AuctionSystem runs a timed auction where bidders compete by sending Ether. The highest bidder wins and their bid goes to the seller when endAuction() is called; all other bidders can withdraw their funds via withdrawBid().',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'What happens to the previous highest bidder\'s funds when a new higher bid comes in?',
        options: [
          'They are immediately refunded',
          'They are added to the bids mapping so the previous bidder can withdraw later',
          'They are sent to the seller',
          'I am not sure',
        ],
        correctAnswer: 'They are added to the bids mapping so the previous bidder can withdraw later',
        explanation: 'placeBid() does bids[highestBidder] += highestBid to credit the outbid bidder, but does not transfer immediately. The previous bidder must call withdrawBid() to retrieve their funds.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Who can call endAuction()?',
        options: [
          'Only the seller',
          'Only the highest bidder',
          'Anyone, once the auction time has passed',
          'I am not sure',
        ],
        correctAnswer: 'Anyone, once the auction time has passed',
        explanation: 'endAuction() only checks require(block.timestamp >= auctionEnd) and require(!auctionEnded). There is no msg.sender restriction — any address can call it once the time has passed.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'What happens if no one has placed a bid and endAuction() is called?',
        correctAnswer: 'The auction ends (auctionEnded = true) and payable(seller).transfer(highestBid) is called with highestBid = 0, sending zero Ether to the seller. The call succeeds but nothing meaningful is transferred.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Where are the outbid amounts tracked, and how does a losing bidder recover their funds?',
        correctAnswer: 'Outbid amounts are tracked in the bids mapping (mapping(address => uint256)). When a bidder is outbid, their previous bid amount is credited to bids[theirAddress]. They must then call withdrawBid() to transfer that amount back to their address.',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

  L: {
    id: 'L',
    label: 'Contract L — Complex, With Proxy',
    timerSeconds: 600,
    // Ordering: compound names before roots
    variants: [
      { AuctionSystemV2: 'SaleContractV2',  AuctionProxy: 'SaleForwarder',   highestBidder: 'topBuyer',    highestBid: 'topOffer',   endAuction: 'closeSale',   placeBid: 'submitOffer', withdrawBid: 'reclaimOffer', upgradeTo: 'updateLogic',  implementation: 'logicContract', auctionEnd: 'saleDeadline', auctionEnded: 'saleClosed', seller: 'vendor',     bids: 'offers'   },
      { AuctionSystemV2: 'BidVaultV2',      AuctionProxy: 'BidForwarder',    highestBidder: 'leadBidder',  highestBid: 'leadAmount', endAuction: 'finalise',    placeBid: 'enterBid',    withdrawBid: 'pullBid',      upgradeTo: 'setLogic',     implementation: 'logicAddress',  auctionEnd: 'closeTime',    auctionEnded: 'vaultClosed', seller: 'auctioneer', bids: 'entries'  },
      { AuctionSystemV2: 'TenderManagerV2', AuctionProxy: 'TenderForwarder', highestBidder: 'topTenderer', highestBid: 'topTender',  endAuction: 'closeTender', placeBid: 'submitTender',withdrawBid: 'reclaimTender',upgradeTo: 'pointTo',      implementation: 'logicTarget',   auctionEnd: 'tenderClose',  auctionEnded: 'tenderClosed',seller: 'issuer',     bids: 'tenders'  },
    ],
    code: `pragma solidity ^0.8.0;

contract AuctionSystemV2 {
    address public seller;
    address public highestBidder;
    uint256 public highestBid;
    uint256 public auctionEnd;
    bool public auctionEnded;
    mapping(address => uint256) public bids;

    function initialize(uint256 durationSeconds) public {
        seller = msg.sender;
        auctionEnd = block.timestamp + durationSeconds;
        auctionEnded = false;
    }

    function placeBid() public payable {
        require(block.timestamp < auctionEnd, "Auction ended");
        require(msg.value > highestBid, "Bid too low");
        if (highestBidder != address(0)) {
            bids[highestBidder] += highestBid;
        }
        highestBidder = msg.sender;
        highestBid = msg.value;
    }

    function withdrawBid() public {
        uint256 amount = bids[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        bids[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function endAuction() public {
        require(block.timestamp >= auctionEnd, "Auction not ended");
        require(!auctionEnded, "Already ended");
        auctionEnded = true;
        payable(seller).transfer(highestBid);
    }
}

contract AuctionProxy {
    address public implementation;
    address public owner;

    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }

    function upgradeTo(address _newImplementation) public {
        require(msg.sender == owner, "Not owner");
        implementation = _newImplementation;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract system do? Describe in 1-2 sentences.',
        correctAnswer: 'The system is an upgradeable auction. AuctionProxy holds all state and forwards calls to AuctionSystemV2 via delegatecall; the proxy owner can upgrade the logic by pointing at a new implementation while preserving all bid data.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'When a bidder calls placeBid() on AuctionProxy, which contract executes the logic?',
        options: [
          'AuctionProxy directly',
          'AuctionSystemV2 via delegatecall',
          'A new contract is created each time',
          'I am not sure',
        ],
        correctAnswer: 'AuctionSystemV2 via delegatecall',
        explanation: 'AuctionProxy\'s fallback uses delegatecall to run AuctionSystemV2\'s code in the proxy\'s storage context.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the bids mapping stored?',
        options: ['In AuctionSystemV2', 'In AuctionProxy', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In AuctionProxy',
        explanation: 'delegatecall executes AuctionSystemV2\'s code but writes to AuctionProxy\'s storage. All state — including the bids mapping — lives in AuctionProxy.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If the proxy is upgraded mid-auction, what happens to existing bids and the current highest bidder? Explain why.',
        correctAnswer: 'All bid data is preserved. The bids mapping, highestBidder, and highestBid all live in AuctionProxy\'s storage, not in AuctionSystemV2. Changing the implementation pointer does not touch the proxy\'s storage. The auction continues with the same state.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Which contract would you audit for security vulnerabilities, AuctionProxy or AuctionSystemV2? Explain your reasoning.',
        correctAnswer: 'Both. AuctionSystemV2 contains the bid and withdrawal logic executed via delegatecall — reentrancy in withdrawBid() or incorrect bid tracking directly affects funds. AuctionProxy controls upgrades and storage layout — an unrestricted upgradeTo() could replace the logic mid-auction, and a storage collision could corrupt bid amounts.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'The proxy owner upgrades the implementation after the auction has ended but before anyone has called withdrawBid(). What risk does this create?',
        options: [
          'No risk — bid data is safely stored in the proxy',
          'The new implementation could have different withdrawal logic or no withdrawBid() at all, potentially locking funds',
          'All bids are automatically refunded on upgrade',
          'I am not sure',
        ],
        correctAnswer: 'The new implementation could have different withdrawal logic or no withdrawBid() at all, potentially locking funds',
        explanation: 'While the bid data is safe in the proxy\'s storage, the logic for accessing it comes from the implementation. A new implementation with no withdrawBid() function, or one with different logic, could make existing bids inaccessible.',
      },
      {
        id: 'difficulty',
        type: 'scale',
        prompt: 'How difficult did you find this contract to understand?',
        min: 1,
        max: 5,
        minLabel: 'Very Easy',
        maxLabel: 'Very Difficult',
      },
    ],
  },

};