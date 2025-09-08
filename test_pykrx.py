"""
pykrx 수급 데이터 테스트 스크립트
"""
from pykrx import stock
from datetime import datetime, timedelta

ticker = "005930"  # 삼성전자
end_date = datetime.now()
start_date = end_date - timedelta(days=20)

end_str = end_date.strftime('%Y%m%d')
start_str = start_date.strftime('%Y%m%d')

print(f"Testing for {ticker} from {start_str} to {end_str}")
print("-" * 50)

# 방법 1: get_market_net_purchases_of_equities
try:
    print("\n1. get_market_net_purchases_of_equities:")
    data = stock.get_market_net_purchases_of_equities(start_str, end_str, "KOSPI", "전체")
    if ticker in data.index:
        print(f"Columns: {data.columns.tolist()}")
        print(data.loc[ticker])
except Exception as e:
    print(f"Error: {e}")

# 방법 2: get_market_trading_value_by_date
try:
    print("\n2. get_market_trading_value_by_date:")
    data = stock.get_market_trading_value_by_date(start_str, end_str, ticker)
    print(f"Columns: {data.columns.tolist()}")
    print(data.head())
except Exception as e:
    print(f"Error: {e}")

# 방법 3: get_market_trading_volume_by_investor
try:
    print("\n3. get_market_trading_volume_by_investor:")
    data = stock.get_market_trading_volume_by_investor(start_str, end_str, "KOSPI")
    print(f"Columns: {data.columns.tolist()}")
    print(data.head())
except Exception as e:
    print(f"Error: {e}")