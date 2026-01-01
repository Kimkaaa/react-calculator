import { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";

const OPERATORS = ["+", "-", "*", "/"];

/**
 * 계산기 상태
 */
interface CalculatorState {
  currentNumber: string;      // 화면 표시 값 (숫자 문자열 또는 에러 메시지)
  previousNumber: string;     // 이전 피연산자 또는 이전 결과
  operation: string | null;   // 선택된 연산자
  lastOperand: string;        // '=' 반복 입력 시 사용할 마지막 피연산자
  isNewNumber: boolean;       // 새 숫자 입력 여부
  historyExpression: string;  // 상단 연산식 표시
}

/**
 * 히스토리 아이템
 */
type HistoryItem = {
  id: string;
  expression: string; // 예: "1 + 2"
  result: string;     // 예: "3"
  operation: string;  // "+", "-", "*", "/"
  operand: string;    // 우항(예: "2") -> '=' 반복 입력용
  createdAt: number;
};

/**
 * 히스토리 기록을 위한 계산 결과 데이터
 */
type HistoryPayload = {
  expression: string;
  result: string;
  operation: string;
  operand: string;
};

/**
 * 초기 상태
 */
const RESET_STATE: CalculatorState = {
  currentNumber: "0",
  previousNumber: "",
  operation: null,
  lastOperand: "",
  isNewNumber: true,
  historyExpression: "",
};

/**
 * 0으로 나누기 에러 상태
 */
const DIVISION_BY_ZERO_STATE: CalculatorState = {
  ...RESET_STATE,
  currentNumber: "0으로 나눌 수 없습니다",
};

/**
 * 연산자 여부 확인
 */
function isOperator(value: string): boolean {
  return OPERATORS.includes(value);
}

/**
 * UI 표기(×,÷)를 내부 연산자(*,/)로 변환
 */
function normalizeOperator(op: string): string {
  if (op === "×") return "*";
  if (op === "÷") return "/";
  return op;
}

/**
 * 내부 연산자(*,/)를 UI 표기(×,÷)로 변환
 */
function toDisplayOperator(op: string): string {
  if (op === "*") return "×";
  if (op === "/") return "÷";
  return op;
}

/**
 * 문자열 숫자를 안전하게 number로 변환
 */
function toNumberSafe(value: string): number | null {
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * 사칙연산 수행
 * - 0으로 나누면 null 반환
 */
function compute(a: number, op: string, b: number): number | null {
  switch (op) {
    case "+":
      return new Decimal(a).plus(b).toNumber();
    case "-":
      return new Decimal(a).minus(b).toNumber();
    case "*":
      return new Decimal(a).times(b).toNumber();
    case "/":
      if (b === 0) return null;
      return new Decimal(a).dividedBy(b).toNumber();
    default:
      return null;
  }
}

/**
 * id 생성 (crypto.randomUUID 미지원 환경 대비)
 */
function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * 연산자 입력에 따른 상태 전이
 */
function reduceOperator(
  prev: CalculatorState,
  operator: string
): { next: CalculatorState; history: HistoryPayload | null } {
  // 에러 상태에서 연산 입력 시 초기화
  const currentParsed = toNumberSafe(prev.currentNumber);
  if (prev.currentNumber !== "" && currentParsed === null) {
    return { next: RESET_STATE, history: null };
  }

  // 1) '=' 반복 입력
  if (
    operator === "=" &&
    prev.isNewNumber &&
    prev.previousNumber &&
    prev.operation &&
    prev.lastOperand
  ) {
    const a = toNumberSafe(prev.previousNumber);
    const b = toNumberSafe(prev.lastOperand);
    if (a === null || b === null) return { next: RESET_STATE, history: null };

    const result = compute(a, prev.operation, b);
    if (result === null) return { next: DIVISION_BY_ZERO_STATE, history: null };

    const resultStr = result.toString();
    const left = prev.previousNumber;
    const op = prev.operation;
    const right = prev.lastOperand;

    return {
      next: {
        ...prev,
        currentNumber: resultStr,
        previousNumber: resultStr,
        isNewNumber: true,
        historyExpression: `${left} ${toDisplayOperator(op)} ${right} =`,
      },
      history: {
        expression: `${left} ${toDisplayOperator(op)} ${right}`,
        result: resultStr,
        operation: op,
        operand: right,
      },
    };
  }

  // 2) 입력 대기 상태 (currentNumber === "")
  if (prev.currentNumber === "") {
    // 연산자 교체
    if (isOperator(operator) && prev.previousNumber && prev.operation) {
      return {
        next: {
          ...prev,
          operation: operator,
          historyExpression: `${prev.previousNumber} ${toDisplayOperator(operator)}`,
        },
        history: null,
      };
    }

    // 7 + = → 7 + 7 =
    if (operator === "=" && prev.previousNumber && prev.operation) {
      const operand = prev.lastOperand || prev.previousNumber;

      const a = toNumberSafe(prev.previousNumber);
      const b = toNumberSafe(operand);
      if (a === null || b === null) return { next: RESET_STATE, history: null };

      const result = compute(a, prev.operation, b);
      if (result === null) return { next: DIVISION_BY_ZERO_STATE, history: null };

      const resultStr = result.toString();
      const left = prev.previousNumber;
      const op = prev.operation;
      const right = operand;

      return {
        next: {
          currentNumber: resultStr,
          previousNumber: resultStr,
          operation: prev.operation,
          lastOperand: operand,
          isNewNumber: true,
          historyExpression: `${left} ${toDisplayOperator(op)} ${right} =`,
        },
        history: {
          expression: `${left} ${toDisplayOperator(op)} ${right}`,
          result: resultStr,
          operation: op,
          operand: right,
        },
      };
    }

    return { next: prev, history: null };
  }

  // 숫자 입력 후 상태
  const current = currentParsed ?? 0;

  // 3) 결과 직후 연산자 입력
  if (prev.isNewNumber && isOperator(operator) && prev.previousNumber && prev.operation) {
    return {
      next: {
        currentNumber: "",
        previousNumber: prev.currentNumber,
        operation: operator,
        lastOperand: "",
        isNewNumber: true,
        historyExpression: `${prev.currentNumber} ${toDisplayOperator(operator)}`,
      },
      history: null,
    };
  }

  // 4) 연속 연산
  if (prev.previousNumber && prev.operation) {
    const a = toNumberSafe(prev.previousNumber);
    if (a === null) return { next: RESET_STATE, history: null };

    const result = compute(a, prev.operation, current);
    if (result === null) return { next: DIVISION_BY_ZERO_STATE, history: null };

    const resultStr = result.toString();

    // '=' 입력
    if (operator === "=") {
      const left = prev.previousNumber;
      const op = prev.operation;
      const right = prev.currentNumber;

      return {
        next: {
          currentNumber: resultStr,
          previousNumber: resultStr,
          operation: prev.operation,
          lastOperand: prev.currentNumber,
          isNewNumber: true,
          historyExpression: `${left} ${toDisplayOperator(op)} ${right} =`,
        },
        history: {
          expression: `${left} ${toDisplayOperator(op)} ${right}`,
          result: resultStr,
          operation: op,
          operand: right,
        },
      };
    }

    // 다음 연산 이어가기
    if (isOperator(operator)) {
      return {
        next: {
          currentNumber: "",
          previousNumber: resultStr,
          operation: operator,
          lastOperand: prev.currentNumber,
          isNewNumber: true,
          historyExpression: `${resultStr} ${toDisplayOperator(operator)}`,
        },
        history: null,
      };
    }

    return { next: prev, history: null };
  }

  // 5) 첫 연산자 선택
  if (operator === "=") {
    return { next: { ...prev, isNewNumber: true }, history: null };
  }

  if (!isOperator(operator)) return { next: prev, history: null };

  const currentStr = current.toString();

  return {
    next: {
      currentNumber: "",
      previousNumber: currentStr,
      operation: operator,
      lastOperand: currentStr,
      isNewNumber: true,
      historyExpression: `${currentStr} ${toDisplayOperator(operator)}`,
    },
    history: null,
  };
}

export default function App() {
  // 다크 모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 계산기 상태
  const [state, setState] = useState<CalculatorState>(RESET_STATE);

  // 히스토리(계산 기록)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // '=' 입력으로 확정된 계산 결과를 임시로 보관
  // setState 이후 useEffect에서 히스토리에 반영하기 위함
  const pendingHistoryRef = useRef<HistoryPayload | null>(null);

  // StrictMode 또는 중복 렌더링 환경에서
  // 동일한 계산 기록이 중복 저장되는 것을 방지
  const lastHistoryKeyRef = useRef<string>("");

  // body 다크 모드 클래스 제어
  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // 초기화
  const handleClear = () => {
    setState(RESET_STATE);
  };

  // 숫자 입력 (클릭/키보드 공용)
  const handleNumber = (value: string) => {
    setState((prev) => {
      // 새 숫자 시작이거나 0에서 시작하면 치환
      if (prev.isNewNumber || prev.currentNumber === "0") {
        return { ...prev, currentNumber: value, isNewNumber: false };
      }

      return { ...prev, currentNumber: prev.currentNumber + value };
    });
  };

  // 소수점 입력
  const handleDot = () => {
    setState((prev) => {
      // 새 숫자 시작이면 "0."부터
      if (prev.isNewNumber) {
        return { ...prev, currentNumber: "0.", isNewNumber: false };
      }
      if (prev.currentNumber.includes(".")) return prev;

      return { ...prev, currentNumber: prev.currentNumber + ".", isNewNumber: false };
    });
  };

  // Backspace 처리
  const handleBackspace = () => {
    setState((prev) => {
      // 결과 상태에서는 상단 연산식만 제거
      if (prev.isNewNumber) {
        if (prev.historyExpression.includes("=")) {
          return { ...prev, historyExpression: "" };
        }
        return prev;
      }

      if (prev.currentNumber.length <= 1) {
        return { ...prev, currentNumber: "0", isNewNumber: true };
      }

      return { ...prev, currentNumber: prev.currentNumber.slice(0, -1) };
    });
  };

  // 연산 처리 (클릭/키보드 공용) 및 히스토리 기록 데이터 생성
  const handleOperator = (operator: string) => {
    const normalized = normalizeOperator(operator);

    setState((prev) => {
      const { next, history } = reduceOperator(prev, normalized);
      pendingHistoryRef.current = normalized === "=" ? history : null;
      return next;
    });
  };

  /**
   * state 변경을 트리거로 사용하고, payload가 있을 때만 히스토리에 기록
   */
  useEffect(() => {
    const payload = pendingHistoryRef.current;
    if (!payload) return;

    pendingHistoryRef.current = null;

    const key = `${payload.expression}|${payload.result}`;
    if (lastHistoryKeyRef.current === key) return;
    lastHistoryKeyRef.current = key;

    setHistory((h) => [
      {
        id: createId(),
        expression: payload.expression,
        result: payload.result,
        operation: payload.operation,
        operand: payload.operand,
        createdAt: Date.now(),
      },
      ...h,
    ]);
  }, [state.currentNumber, state.historyExpression]);

  // 공용 클릭 핸들러
  const onNumberClick = (e: React.MouseEvent<HTMLInputElement>) => {
    handleNumber(e.currentTarget.value);
  };

  const onOperatorClick = (e: React.MouseEvent<HTMLInputElement>) => {
    handleOperator(e.currentTarget.value);
  };

  // 히스토리 항목 선택 시: 해당 결과를 현재 값으로 로드하고, '=' 반복 입력이 되도록 컨텍스트 복원
  const onSelectHistory = (item: HistoryItem) => {
    setState({
      ...RESET_STATE,
      currentNumber: item.result,
      previousNumber: item.result,
      operation: item.operation,
      lastOperand: item.operand,
      isNewNumber: true,
      historyExpression: `${item.expression} =`,
    });
    setIsHistoryOpen(false);
  };

  // 키보드 입력
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      // 숫자
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleNumber(key);
        return;
      }

      // 소수점
      if (key === ".") {
        e.preventDefault();
        handleDot();
        return;
      }

      // 연산자(+ - * /)
      if (isOperator(key)) {
        e.preventDefault();
        handleOperator(key);
        return;
      }

      // 결과 (= / Enter)
      if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleOperator("=");
        return;
      }

      // 초기화 (Esc / c / C)
      if (key === "Escape" || key === "c" || key === "C") {
        e.preventDefault();
        handleClear();
        return;
      }

      // Backspace
      if (key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {/* 히스토리 열기 */}
      <button
        type="button"
        className="history-toggle"
        onClick={() => setIsHistoryOpen(true)}
        aria-label="계산 기록 열기"
        aria-expanded={isHistoryOpen}
      >
        ☰
      </button>

      {/* 다크 모드 */}
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setIsDarkMode((prev) => !prev)}
        aria-pressed={isDarkMode}
        aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
      >
        {isDarkMode ? "☀️" : "🌙"}
      </button>

      {/* 히스토리 바텀시트 */}
      <div
        className={`history-overlay ${isHistoryOpen ? "open" : ""}`}
        onClick={() => setIsHistoryOpen(false)}
        role="presentation"
      >
        <section
          className={`history-sheet ${isHistoryOpen ? "open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="계산 기록"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="history-header">
            <strong>기록</strong>
            <button
              type="button"
              className="history-close"
              onClick={() => setIsHistoryOpen(false)}
              aria-label="계산 기록 닫기"
            >
              ✕
            </button>
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">기록이 없습니다</div>
            ) : (
              history.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="history-item"
                  onClick={() => onSelectHistory(item)}
                  aria-label={`${item.expression}, 결과 ${item.result}`}
                >
                  <div className="history-expression">{item.expression}</div>
                  <div className="history-result">{item.result}</div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <article className={`calculator ${isDarkMode ? "dark" : ""}`} aria-label="계산기">

        {/* 값 변경 시 스크린리더가 읽도록 하는 라이브 영역 */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          현재 값 {state.currentNumber}
        </div>

        <form>
          <div className="display">
            {state.historyExpression && (
              <div className="expression">{state.historyExpression}</div>
            )}
            <input type="text" value={state.currentNumber} readOnly aria-label="현재 값" />
          </div>
          <input type="button" className="clear" value="C" onClick={handleClear} aria-label="초기화" />
          <input type="button" className="operator" value="÷" onClick={onOperatorClick} aria-label="나누기" />
          <input type="button" value="1" onClick={onNumberClick} />
          <input type="button" value="2" onClick={onNumberClick} />
          <input type="button" value="3" onClick={onNumberClick} />
          <input type="button" className="operator" value="×" onClick={onOperatorClick} aria-label="곱하기" />
          <input type="button" value="4" onClick={onNumberClick} />
          <input type="button" value="5" onClick={onNumberClick} />
          <input type="button" value="6" onClick={onNumberClick} />
          <input type="button" className="operator" value="+" onClick={onOperatorClick} aria-label="더하기" />
          <input type="button" value="7" onClick={onNumberClick} />
          <input type="button" value="8" onClick={onNumberClick} />
          <input type="button" value="9" onClick={onNumberClick} />
          <input type="button" className="operator" value="-" onClick={onOperatorClick} aria-label="빼기" />
          <input type="button" className="dot" value="." onClick={handleDot} aria-label="소수점" />
          <input type="button" value="0" onClick={onNumberClick} />
          <input type="button" className="operator result" value="=" onClick={onOperatorClick} aria-label="계산 결과"/>
        </form>
      </article>
    </>
  );
}