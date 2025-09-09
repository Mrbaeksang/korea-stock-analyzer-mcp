import requests
import json

BASE_URL = "https://korea-stock-analyzer-mcp.vercel.app/api/stock_data"
TEST_TICKER = "344820"  # KCC 글라스

def test_tool(method, params):
    print(f"\n{'='*50}")
    print(f"Testing: {method}")
    print(f"Params: {params}")
    print('-'*50)
    
    try:
        response = requests.post(BASE_URL, json={
            "method": method,
            "params": params
        }, timeout=30)
        
        if response.status_code != 200:
            print(f"HTTP Error: {response.status_code}")
            return False
            
        data = response.json()
        
        if 'error' in data:
            print(f"ERROR: {data['error']}")
            if 'trace' in data:
                print(f"Trace: {data['trace'][:200]}...")
            return False
        else:
            print("SUCCESS!")
            print(json.dumps(data, indent=2, ensure_ascii=False)[:1000])
            if len(json.dumps(data)) > 1000:
                print("... (truncated)")
            return True
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        return False

print(f"Testing all Vercel endpoints with KCC Glass ({TEST_TICKER})")
print(f"URL: {BASE_URL}")
print("="*50)

# Test all 5 API methods
tests = [
    ("getMarketData", {"ticker": TEST_TICKER}),
    ("getFinancialData", {"ticker": TEST_TICKER, "years": 1}),
    ("getFinancialData", {"ticker": TEST_TICKER, "years": 3}),  # Test multi-year
    ("getTechnicalIndicators", {"ticker": TEST_TICKER}),
    ("getSupplyDemand", {"ticker": TEST_TICKER}),
    ("searchPeers", {"ticker": TEST_TICKER})
]

success_count = 0
for method, params in tests:
    if test_tool(method, params):
        success_count += 1

print(f"\n{'='*50}")
print(f"FINAL RESULT: {success_count}/{len(tests)} tests passed")

if success_count == len(tests):
    print("✓ All API endpoints working perfectly!")
else:
    print("✗ Some endpoints failed - check logs above")
