import requests
import json

BASE_URL = "https://korea-stock-analyzer-mcp.vercel.app/api/stock_data"

# 적자 기업 예시 (최근 적자 기록이 있는 기업들)
test_tickers = [
    "005930",  # 삼성전자 (흑자 - 대조군)
    "373220",  # LG에너지솔루션 (과거 적자 기록)
    "247540",  # 에코프로비엠 (변동성 높음)
]

print("Testing PER calculation for companies (including loss-making ones):\n")

for ticker in test_tickers:
    print(f"[{ticker}] Testing...")
    try:
        response = requests.post(BASE_URL, json={
            "method": "getFinancialData",
            "params": {"ticker": ticker, "years": 1}
        }, timeout=30)
        
        data = response.json()
        
        if 'error' in data:
            print(f"  Error: {data['error']}")
        else:
            per = data.get('per', 'N/A')
            eps = data.get('eps', 'N/A')
            
            print(f"  PER: {per}")
            print(f"  EPS: {eps}")
            
            if isinstance(per, (int, float)) and per < 0:
                print(f"  -> Negative PER detected! Company is making losses.")
            elif per == 0:
                print(f"  -> PER is 0, might need recalculation")
            elif per == -999:
                print(f"  -> -999 indicates loss (old logic)")
                
    except Exception as e:
        print(f"  Failed: {str(e)}")
    print()

print("\nNote: Negative PER should be calculated as Price / Negative_EPS")
