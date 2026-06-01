export const contracts = {
  A: {
    id: 'A',
    label: 'Contract A — Simple, No Proxy',
    timerSeconds: 400,
    // Ordering rule: compound names (setValue, getValue) before their root (value)
    variants: [
      { SimpleStorage: 'DataVault',    setValue: 'storeAmount',  getValue: 'fetchAmount',  value: 'amount'  },
      { SimpleStorage: 'CounterStore', setValue: 'setCount',     getValue: 'getCount',     value: 'count'   },
      { SimpleStorage: 'RecordKeeper', setValue: 'writeRecord',  getValue: 'readRecord',   value: 'record'  },
    ],
    code: `pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract do? Describe in 1-2 sentences.',
        correctAnswer: 'SimpleStorage is a basic storage contract that stores a single uint256 value on-chain. It exposes setValue to write the value and getValue to read it.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'If you call getValue(), which contract executes the logic?',
        options: ['SimpleStorage directly', 'A separate implementation contract', 'I am not sure'],
        correctAnswer: 'SimpleStorage directly',
        explanation: 'There is no proxy. Calls go directly to SimpleStorage which executes the logic itself.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the variable "value" stored?',
        options: ['In SimpleStorage', 'In a separate contract', 'I am not sure'],
        correctAnswer: 'In SimpleStorage',
        explanation: 'Without a proxy, state is stored in the contract that declares it — SimpleStorage.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If setValue is called twice with different values, what is stored after the second call and why?',
        correctAnswer: 'The second value is stored. Each call to setValue overwrites the previous value because the state variable is a single uint256 slot — there is no history or array.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Can the owner of this contract change the value without calling setValue? Why or why not?',
        correctAnswer: 'No — there is no owner mechanism or privileged function in this contract. The only way to change the value is through setValue, which is public and callable by anyone.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'What happens to the value stored in this contract if the contract is redeployed at a new address?',
        options: [
          'The value is copied to the new contract',
          'The value is lost, the new contract starts fresh',
          'The value is stored permanently on the blockchain',
          'I am not sure',
        ],
        correctAnswer: 'The value is lost, the new contract starts fresh',
        explanation: 'State is tied to a specific contract address. A redeployment creates a new contract with empty storage — nothing is migrated automatically.',
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

  B: {
    id: 'B',
    label: 'Contract B — Simple, With Proxy',
    timerSeconds: 400,
    // Ordering: SimpleStorageV2 before any shorter root, setValue/getValue before value
    variants: [
      { SimpleStorageV2: 'DataVaultV2',    Proxy: 'Forwarder',  setValue: 'storeAmount', getValue: 'fetchAmount', implementation: 'target',   value: 'amount' },
      { SimpleStorageV2: 'CounterStoreV2', Proxy: 'Dispatcher', setValue: 'setCount',    getValue: 'getCount',    implementation: 'delegate', value: 'count'  },
      { SimpleStorageV2: 'RecordKeeperV2', Proxy: 'Gateway',    setValue: 'writeRecord', getValue: 'readRecord',  implementation: 'backend',  value: 'record' },
    ],
    code: `pragma solidity ^0.8.0;

contract SimpleStorageV2 {
    uint256 private value;

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}

contract Proxy {
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
        correctAnswer: 'The system uses a Proxy contract that forwards all calls via delegatecall to SimpleStorageV2. This allows the logic contract to be swapped while the storage and address remain on the Proxy.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'If you call getValue(), which contract executes the logic?',
        options: [
          'Proxy forwards the call to SimpleStorageV2',
          'SimpleStorageV2 directly',
          'I am not sure',
        ],
        correctAnswer: 'Proxy forwards the call to SimpleStorageV2',
        explanation: 'The Proxy has a fallback function that uses delegatecall to forward every call to the implementation contract (SimpleStorageV2).',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the variable "value" stored?',
        options: ['In SimpleStorageV2', 'In the Proxy contract', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In the Proxy contract',
        explanation: 'delegatecall executes the implementation\'s code but in the storage context of the calling contract (Proxy). So all state, including "value", lives in the Proxy\'s storage.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If the implementation contract is upgraded to a new address, what happens to the value already stored? Explain why.',
        correctAnswer: 'The stored value is preserved. Because all state lives in the Proxy\'s storage (not in SimpleStorageV2), pointing the Proxy at a new implementation does not change the Proxy\'s storage slots.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Which contract would you need to audit to check for security issues, the Proxy or SimpleStorageV2? Explain your reasoning.',
        correctAnswer: 'Both need auditing. SimpleStorageV2 contains the business logic executed via delegatecall, so bugs there directly affect the system. The Proxy controls the upgrade mechanism and storage layout, so misuse of the implementation pointer is also a critical attack surface.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'If someone calls setValue(42) through the Proxy, where is the number 42 actually stored?',
        options: ['In SimpleStorageV2', 'In the Proxy contract', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In the Proxy contract',
        explanation: 'delegatecall runs SimpleStorageV2\'s code inside the Proxy\'s storage context. All writes go to the Proxy\'s storage slots, not SimpleStorageV2\'s.',
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

  C: {
    id: 'C',
    label: 'Contract C — Complex, No Proxy',
    timerSeconds: 600,
    // Ordering: closeVoting before vote; voteCounts before vote (avoids replaceAll hitting "vote" inside "voteCounts"); vote before hasVoted
    variants: [
      { VotingSystem: 'ElectionManager', closeVoting: 'endElection',  candidateId: 'candidateIndex', voteCounts: 'tally',       votingOpen: 'electionActive', vote: 'castVote',   hasVoted: 'alreadyVoted', owner: 'admin'     },
      { VotingSystem: 'PollContract',    closeVoting: 'closePoll',    candidateId: 'optionId',       voteCounts: 'scores',      votingOpen: 'pollActive',     vote: 'submitVote', hasVoted: 'participated',  owner: 'moderator' },
      { VotingSystem: 'BallotSystem',    closeVoting: 'sealBallot',   candidateId: 'choiceId',       voteCounts: 'ballotCount', votingOpen: 'ballotOpen',     vote: 'recordVote', hasVoted: 'voteRecorded',  owner: 'organizer' },
    ],
    code: `pragma solidity ^0.8.0;

contract VotingSystem {
    mapping(address => bool) public hasVoted;
    mapping(uint256 => uint256) public voteCounts;
    address public owner;
    bool public votingOpen;

    constructor() {
        owner = msg.sender;
        votingOpen = true;
    }

    function vote(uint256 candidateId) public {
        require(votingOpen, "Voting is closed");
        require(!hasVoted[msg.sender], "Already voted");
        hasVoted[msg.sender] = true;
        voteCounts[candidateId]++;
    }

    function closeVoting() public {
        require(msg.sender == owner, "Not owner");
        votingOpen = false;
    }
}`,
    questions: [
      {
        id: 'q1',
        type: 'text',
        prompt: 'What does this contract do? Describe in 1-2 sentences.',
        correctAnswer: 'VotingSystem is a simple on-chain voting contract where each address can vote once for a candidate identified by an integer ID. The deployer can close voting at any time.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'Who is allowed to call closeVoting()?',
        options: [
          'Only the address that deployed the contract',
          'Anyone',
          'Only addresses that have voted',
          'I am not sure',
        ],
        correctAnswer: 'Only the address that deployed the contract',
        explanation: 'closeVoting() has require(msg.sender == owner), and owner is set to msg.sender in the constructor — meaning only the deployer can call it.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'What happens if the same address calls vote() twice?',
        options: [
          'The vote is counted twice',
          'The second call is rejected',
          'The first vote is overwritten',
          'I am not sure',
        ],
        correctAnswer: 'The second call is rejected',
        explanation: 'vote() has require(!hasVoted[msg.sender]). After voting once, hasVoted[msg.sender] is true, so any subsequent call reverts.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If votingOpen is false, what happens when someone calls vote()? Explain why.',
        correctAnswer: 'The transaction reverts with "Voting is closed". The first line of vote() is require(votingOpen, "Voting is closed"), which fails when votingOpen is false.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: "Where is each voter's voting status stored, and what type of data structure is used?",
        correctAnswer: 'Each voter\'s status is stored in the hasVoted mapping (mapping(address => bool)) in the VotingSystem contract\'s storage. It maps each voter\'s address to a boolean indicating whether they have voted.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'If closeVoting() is called, can the owner reopen voting?',
        options: [
          'Yes, by calling openVoting()',
          'No, there is no function to reopen voting',
          'Only by deploying a new contract',
          'I am not sure',
        ],
        correctAnswer: 'No, there is no function to reopen voting',
        explanation: 'closeVoting() sets votingOpen to false, but there is no corresponding openVoting() function in the contract. Once closed, voting cannot be reopened without deploying a new contract.',
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

  D: {
    id: 'D',
    label: 'Contract D — Complex, With Proxy',
    timerSeconds: 600,
    // Ordering: VotingSystemV2/VotingProxy first; closeVoting/upgradeTo before vote; voteCounts before vote; vote before hasVoted
    variants: [
      { VotingSystemV2: 'ElectionManagerV2', VotingProxy: 'ElectionProxy',  closeVoting: 'endElection', upgradeTo: 'upgradeLogic', candidateId: 'candidateIndex', voteCounts: 'tally',       votingOpen: 'electionActive', vote: 'castVote',   hasVoted: 'alreadyVoted', initialize: 'setup',    implementation: 'logicContract', owner: 'admin'     },
      { VotingSystemV2: 'PollContractV2',    VotingProxy: 'PollForwarder',   closeVoting: 'closePoll',  upgradeTo: 'setLogic',     candidateId: 'optionId',       voteCounts: 'scores',      votingOpen: 'pollActive',     vote: 'submitVote', hasVoted: 'participated',  initialize: 'activate', implementation: 'logicAddress',  owner: 'moderator' },
      { VotingSystemV2: 'BallotSystemV2',    VotingProxy: 'BallotProxy',     closeVoting: 'sealBallot', upgradeTo: 'pointTo',      candidateId: 'choiceId',       voteCounts: 'ballotCount', votingOpen: 'ballotOpen',     vote: 'recordVote', hasVoted: 'voteRecorded',  initialize: 'init',     implementation: 'logicTarget',   owner: 'organizer' },
    ],
    code: `pragma solidity ^0.8.0;

contract VotingSystemV2 {
    mapping(address => bool) public hasVoted;
    mapping(uint256 => uint256) public voteCounts;
    address public owner;
    bool public votingOpen;

    function initialize() public {
        owner = msg.sender;
        votingOpen = true;
    }

    function vote(uint256 candidateId) public {
        require(votingOpen, "Voting is closed");
        require(!hasVoted[msg.sender], "Already voted");
        hasVoted[msg.sender] = true;
        voteCounts[candidateId]++;
    }

    function closeVoting() public {
        require(msg.sender == owner, "Not owner");
        votingOpen = false;
    }
}

contract VotingProxy {
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
        correctAnswer: 'The system is an upgradeable voting application. VotingProxy holds the state and forwards all calls to VotingSystemV2 via delegatecall; the owner can upgrade the logic by pointing the proxy to a new implementation.',
      },
      {
        id: 'q2',
        type: 'radio',
        prompt: 'When a user calls vote() on VotingProxy, which contract actually executes the logic?',
        options: [
          'VotingProxy directly',
          'VotingSystemV2 via delegatecall',
          'A new contract is created each time',
          'I am not sure',
        ],
        correctAnswer: 'VotingSystemV2 via delegatecall',
        explanation: 'VotingProxy\'s fallback uses delegatecall to run VotingSystemV2\'s code in the proxy\'s storage context.',
      },
      {
        id: 'q3',
        type: 'radio',
        prompt: 'Where is the hasVoted mapping stored?',
        options: ['In VotingSystemV2', 'In VotingProxy', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In VotingProxy',
        explanation: 'delegatecall executes VotingSystemV2\'s code but writes to VotingProxy\'s storage. All state — including hasVoted — lives in VotingProxy.',
      },
      {
        id: 'q4',
        type: 'text',
        prompt: 'If the owner calls upgradeTo() with a new implementation address, what happens to the existing voting data? Explain why.',
        correctAnswer: 'All existing voting data (hasVoted, voteCounts, etc.) is preserved because the data lives in VotingProxy\'s storage, not in VotingSystemV2. Changing the implementation pointer does not touch the proxy\'s storage slots.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Which contract would you need to audit to check for security vulnerabilities, VotingProxy or VotingSystemV2? Explain your reasoning.',
        correctAnswer: 'Both. VotingSystemV2 contains the voting logic executed via delegatecall — bugs there directly affect behaviour. VotingProxy controls who can upgrade and manages storage layout — a storage collision or unrestricted upgradeTo() is equally dangerous.',
      },
      {
        id: 'q6',
        type: 'radio',
        prompt: 'If a voter calls vote(42) through VotingProxy, where is their hasVoted entry updated?',
        options: ['In VotingSystemV2', 'In VotingProxy', 'In both contracts', 'I am not sure'],
        correctAnswer: 'In VotingProxy',
        explanation: 'delegatecall runs VotingSystemV2\'s code inside VotingProxy\'s storage context. All state writes, including hasVoted[msg.sender], happen in VotingProxy\'s storage.',
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
// ROUND 2 CONTRACTS  (E, F, G, H)
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
        id: 'q6',
        type: 'radio',
        prompt: 'Who is allowed to call confirmDelivery()?',
        options: ['Only the arbiter', 'Only the depositor', 'Anyone', 'I am not sure'],
        correctAnswer: 'Only the depositor',
        explanation: 'confirmDelivery() has require(msg.sender == depositor, "Not depositor"). Only the depositor can confirm delivery and trigger the fund release to the beneficiary.',
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


// ─────────────────────────────────────────────────────────────
// ROUND 3 CONTRACTS  (I, J, K, L)
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
        id: 'q6',
        type: 'radio',
        prompt: 'Where does the highest bidder\'s ETH go when endAuction() is called?',
        options: [
          'It is returned to the highest bidder',
          'It is sent to the seller',
          'It stays in the contract',
          'I am not sure',
        ],
        correctAnswer: 'It is sent to the seller',
        explanation: 'endAuction() calls payable(seller).transfer(highestBid), sending the winning bid amount directly to the seller\'s address.',
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

// Round → contract IDs and lookup
export const contractsByRound = {
  1: { ids: ['A', 'B', 'C', 'D'], contracts: contracts },
  2: { ids: ['E', 'F', 'G', 'H'], contracts: contractsRound2 },
  3: { ids: ['I', 'J', 'K', 'L'], contracts: contractsRound3 },
}

// Category order within each round: [small_noproxy, small_proxy, large_noproxy, large_proxy]
export const ROUND_CATEGORY_MAP = {
  1: { A: 'small_noproxy', B: 'small_proxy', C: 'large_noproxy', D: 'large_proxy' },
  2: { E: 'small_noproxy', F: 'small_proxy', G: 'large_noproxy', H: 'large_proxy' },
  3: { I: 'small_noproxy', J: 'small_proxy', K: 'large_noproxy', L: 'large_proxy' },
}
