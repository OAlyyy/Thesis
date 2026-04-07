function escapeField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function generateCSV(participantId, backgroundAnswers, contractOrder, contractResults, sessionSeed) {
  const headers = [
    'participant_id',
    'timestamp',
    'session_seed',
    'presentation_order',
    'years_programming',
    'years_professional',
    'solidity_experience',
    'proxy_experience',
    'peer_experience',
    'occupation',
    'blockchain_familiarity',
    'contract_a_time_seconds',
    'contract_a_timer_expired',
    'contract_a_q1',
    'contract_a_q2',
    'contract_a_q3',
    'contract_a_q4',
    'contract_a_q5',
    'contract_a_q6',
    'contract_a_difficulty',
    'contract_b_time_seconds',
    'contract_b_timer_expired',
    'contract_b_q1',
    'contract_b_q2',
    'contract_b_q3',
    'contract_b_q4',
    'contract_b_q5',
    'contract_b_q6',
    'contract_b_q7',
    'contract_b_difficulty',
    'contract_c_time_seconds',
    'contract_c_timer_expired',
    'contract_c_q1',
    'contract_c_q2',
    'contract_c_q3',
    'contract_c_q4',
    'contract_c_q5',
    'contract_c_difficulty',
    'contract_d_time_seconds',
    'contract_d_timer_expired',
    'contract_d_q1',
    'contract_d_q2',
    'contract_d_q3',
    'contract_d_q4',
    'contract_d_q5',
    'contract_d_difficulty',
  ];

  const bg = backgroundAnswers || {};

  const getContractField = (contractId, field) => {
    const result = contractResults[contractId];
    if (!result) return '';
    if (field === 'time_seconds') return result.timeSpent !== undefined ? result.timeSpent : '';
    if (field === 'timer_expired') return result.timerExpired !== undefined ? String(result.timerExpired) : '';
    if (field === 'difficulty') return result.answers && result.answers['difficulty'] !== undefined ? result.answers['difficulty'] : '';
    return result.answers && result.answers[field] !== undefined ? result.answers[field] : '';
  };

  const row = [
    participantId,
    new Date().toISOString(),
    sessionSeed,
    contractOrder ? contractOrder.join(',') : '',
    bg.years_programming !== undefined ? bg.years_programming : '',
    bg.years_professional !== undefined ? bg.years_professional : '',
    bg.solidity_experience !== undefined ? bg.solidity_experience : '',
    bg.proxy_experience !== undefined ? bg.proxy_experience : '',
    bg.peer_experience !== undefined ? bg.peer_experience : '',
    bg.occupation !== undefined ? bg.occupation : '',
    bg.blockchain_familiarity !== undefined ? bg.blockchain_familiarity : '',
    // Contract A
    getContractField('A', 'time_seconds'),
    getContractField('A', 'timer_expired'),
    getContractField('A', 'q1'),
    getContractField('A', 'q2'),
    getContractField('A', 'q3'),
    getContractField('A', 'q4'),
    getContractField('A', 'q5'),
    getContractField('A', 'q6'),
    getContractField('A', 'difficulty'),
    // Contract B
    getContractField('B', 'time_seconds'),
    getContractField('B', 'timer_expired'),
    getContractField('B', 'q1'),
    getContractField('B', 'q2'),
    getContractField('B', 'q3'),
    getContractField('B', 'q4'),
    getContractField('B', 'q5'),
    getContractField('B', 'q6'),
    getContractField('B', 'q7'),
    getContractField('B', 'difficulty'),
    // Contract C
    getContractField('C', 'time_seconds'),
    getContractField('C', 'timer_expired'),
    getContractField('C', 'q1'),
    getContractField('C', 'q2'),
    getContractField('C', 'q3'),
    getContractField('C', 'q4'),
    getContractField('C', 'q5'),
    getContractField('C', 'difficulty'),
    // Contract D
    getContractField('D', 'time_seconds'),
    getContractField('D', 'timer_expired'),
    getContractField('D', 'q1'),
    getContractField('D', 'q2'),
    getContractField('D', 'q3'),
    getContractField('D', 'q4'),
    getContractField('D', 'q5'),
    getContractField('D', 'difficulty'),
  ];

  const headerLine = headers.map(escapeField).join(',');
  const dataLine = row.map(escapeField).join(',');
  return headerLine + '\r\n' + dataLine + '\r\n';
}

export function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
