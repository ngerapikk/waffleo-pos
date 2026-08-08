const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', {
      pin: '123456'
    });
    console.log("Token:", res.data.token);
    
    // Now get the shift for August 7th
    const shift7 = await axios.get('http://localhost:3001/api/reports/shift?date=2026-08-07', {
      headers: { Authorization: `Bearer ${res.data.token}` }
    });
    console.log("Aug 7:", shift7.data);

    // Get shift for August 8th
    const shift8 = await axios.get('http://localhost:3001/api/reports/shift?date=2026-08-08', {
      headers: { Authorization: `Bearer ${res.data.token}` }
    });
    console.log("Aug 8:", shift8.data);
    
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
