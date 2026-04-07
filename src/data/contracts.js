export const contracts = {
  A: {
    id: 'A',
    label: 'Contract A — Simple, No Proxy',
    timerSeconds: 400,
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
        id: 'q7',
        type: 'text',
        prompt: 'If you only had access to the Proxy contract code and not SimpleStorageV2, could you determine what getValue() returns? Explain your answer.',
        correctAnswer: 'No. The Proxy blindly forwards calls via delegatecall without knowing the ABI of the implementation. You would need SimpleStorageV2\'s code (or ABI) to know what getValue() does or returns.',
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
