import requests
import json

BASE_URL = "https://korea-stock-analyzer-mcp.vercel.app/api/stock_data"
TEST_TICKER = "005930"  # Samsung Electronics

def test_tool(method, params):
    print(f"\n[Testing {method}]")
    try:
        response = requests.post(BASE_URL, json={
            "method": method,
            "params": params
        }, timeout=30)
        data = response.json()
        
        if 'error' in data:
            print(f"ERROR: {data['error']}")
            return False
        else:
            print(f"SUCCESS! Sample data:")
            # Print first few keys
            if isinstance(data, dict):
                for key in list(data.keys())[:3]:
                    print(f"  - {key}: {data[key]}")
            return True
    except Exception as e:
        print(f"FAILED: {str(e)}")
        return False

# Methods to test
tests = [
    ("getMarketData", {"ticker": TEST_TICKER}),
    ("getFinancialData", {"ticker": TEST_TICKER, "years": 1}),
    ("getTechnicalIndicators", {"ticker": TEST_TICKER}),
    ("getSupplyDemand", {"ticker": TEST_TICKER}),
    ("searchPeers", {"ticker": TEST_TICKER})
]

print(f"Testing all Vercel API endpoints with {TEST_TICKER}...")
success_count = 0

for method, params in tests:
    if test_tool(method, params):
        success_count += 1

print(f"\nResult: {success_count}/{len(tests)} tools working properly")
print("\nNote: calculate_dcf is computed in TypeScript using data from other tools")
print("Note: analyze_equity combines data from multiple tools")
