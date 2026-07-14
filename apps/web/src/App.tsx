import { useEffect, useMemo, useState } from "react";

import { BasketEnvelope, ForecastEnvelope, RouteEnvelope, fetchBasket, fetchForecasts, fetchRoute, issueToken } from "./api/client";
import FreshAlertSection from "./components/FreshAlert";

function formatWon(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

export default function App() {
  const [basket, setBasket] = useState<BasketEnvelope | null>(null);
  const [forecast, setForecast] = useState<ForecastEnvelope | null>(null);
  const [route, setRoute] = useState<RouteEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        const token = await issueToken("user_dev_01");
        const [basketData, forecastData, routeData] = await Promise.all([
          fetchBasket(token),
          fetchForecasts(),
          fetchRoute(),
        ]);
        setBasket(basketData);
        setForecast(forecastData);
        setRoute(routeData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "unknown error");
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const heroStats = useMemo(() => {
    if (!basket) {
      return {
        items: 0,
        totalPrice: 0,
        routeTime: 0,
      };
    }
    return {
      items: basket.data.basket.length,
      totalPrice: basket.data.basket.reduce((sum, i) => sum + i.avg_price, 0),
      routeTime: route?.data.estimated_time_mins ?? 0,
    };
  }, [basket, route]);

  return (
    <div className="page">
      <div className="bg-shape bg-shape-one" />
      <div className="bg-shape bg-shape-two" />

      <header className="announcement-bar">
        <span>농가 폐기 0원 수렴을 위한 실시간 수급 오케스트레이션 테스트베드 운영 중</span>
        <nav>
          <a href="#dashboard">B2B 대시보드</a>
          <a href="#fresh-alert">FreshAlert</a>
          <a href="#mobile">모바일 UX</a>
        </nav>
      </header>

      <div className="top-nav">
        <div className="brand-mark">A</div>
        <strong>ASF-Orchestrator</strong>
        <ul>
          <li>Products</li>
          <li>Forecast</li>
          <li>Logistics</li>
          <li>ESG</li>
        </ul>
      </div>

      <main className="container">
        <section className="hero">
          <article>
            <h1>
              수급 예측과 건강 추천을
              <span> 하나의 장바구니</span>
              로 연결합니다
            </h1>
            <p>
              ASF-Orchestrator는 실시간 공급과잉 지표, 사용자 건강 목표, 물류 탄소비용을 동시에 계산해
              동적 가격과 친환경 배송 경로를 함께 제안합니다.
            </p>
            <div className="cta-row">
              <button className="btn-primary">플랫폼 시뮬레이션 시작</button>
              <button className="btn-secondary">아키텍처 보기</button>
            </div>

            <div className="stats-row">
              <div className="stats-card stats-highlight">
                <b>{heroStats.items}</b>
                <span>추천 품목 수</span>
              </div>
              <div className="stats-card">
                <b>{formatWon(heroStats.totalPrice)}원</b>
                <span>총 예상 금액</span>
              </div>
              <div className="stats-card">
                <b>{heroStats.routeTime}분</b>
                <span>예상 배송 시간</span>
              </div>
            </div>
          </article>

          <aside>
            <div className="hero-visual">
              <div className="lime-panel" />
              <div className="floating-chip">Smart Basket Ready</div>
              <div className="floating-card">
                다음 배치에서 양배추·양파 수급 과잉 위험이 높습니다. 추천 가중치 β가 자동 상향됩니다.
              </div>
            </div>
          </aside>
        </section>

        <section className="module-grid" id="dashboard">
          <article className="module-card">
            <h2>AI Basket (B2C)</h2>
            {loading && <p>데이터 로딩 중...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && basket && (
              <>
                <p className="module-summary">
                  추천 품목 {basket.data.basket.length}개 · 합계 {formatWon(basket.data.basket.reduce((s, i) => s + i.avg_price, 0))}원
                </p>
                <ul className="item-list">
                  {basket.data.basket.map((item) => (
                    <li key={item.item_name}>
                      <div>
                        <strong>{item.item_name}</strong>
                        <small>{item.category}</small>
                      </div>
                      <div className="price-col">
                        <span>{formatWon(item.avg_price)}원</span>
                        <em>{item.recommend_reason}</em>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>

          <article className="module-card">
            <h2>VRP Logistics (B2B)</h2>
            {!loading && route && (
              <>
                <p className="module-summary">
                  {route.data.message}
                </p>
                <ul className="item-list">
                  <li>
                    <div>
                      <strong>경로 {route.data.route_id}</strong>
                      <small>최적 경로</small>
                    </div>
                    <div className="price-col">
                      <span>{route.data.distance_km}km</span>
                      <em>{route.data.estimated_time_mins}분</em>
                    </div>
                  </li>
                </ul>
              </>
            )}
          </article>

          <article className="module-card wide">
            <h2>14일 수급/가격 예측</h2>
            {!loading && forecast && (
              <div className="forecast-grid">
                {forecast.data.forecasts.map((item) => (
                  <div key={item.item_name} className="forecast-item">
                    <strong>{item.item_name}</strong>
                    <span>다음주 {formatWon(item.next_week_price)}원</span>
                    <span className={`trend-${item.trend}`}>
                      {item.trend === "up" ? "▲ 상승" : item.trend === "down" ? "▼ 하락" : "— 보합"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <FreshAlertSection />

        <section className="feature-section" id="mobile">
          <h2>모듈 시스템 맵</h2>
          <div className="feature-grid">
            <div>
              <h3>Data Ingestion</h3>
              <p>Airflow 배치 시나리오를 기준으로 공공 데이터를 Feature Store에 동기화</p>
            </div>
            <div>
              <h3>AI Orchestration</h3>
              <p>TFT 예측과 다목적 추천함수를 결합해 사용자별 장바구니 생성</p>
            </div>
            <div>
              <h3>Execution Layer</h3>
              <p>동적 할인율, ESG 포인트, VRP 배차 결과를 API로 실시간 전달</p>
            </div>
          </div>
        </section>

        <section className="community-card">
          <div>
            <h2>내일 아침의 장보기가 산지 폐기를 멈춥니다.</h2>
            <p>ASF-Orchestrator는 소비자와 생산자 데이터를 같은 목적함수로 연결합니다.</p>
          </div>
          <button className="btn-primary">파트너십 문의</button>
        </section>
      </main>
    </div>
  );
}
