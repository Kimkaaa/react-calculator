import { useEffect, useState } from "react";
import Decimal from "decimal.js";

interface CalculatorState {
  currentNumber: string;     // 현재 입력 중인 숫자
  previousNumber: string;    // 이전에 입력한 숫자
  operation: string | null;  // 연산 기호 또는 null
  isNewNumber: boolean;      // 새로운 숫자 입력 여부
}

export default function App() {
  // 다크 모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);

  // body 다크 모드 클래스 제어
  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // 계산기 상태 관리
  const [state, setState] = useState<CalculatorState>({
    currentNumber: '0',   // 화면에 표시되는 값
    previousNumber: '',   // 연산자 선택 전 값
    operation: null,      // 선택된 연산자
    isNewNumber: true,    // 새 숫자 입력 여부
  });

  // 숫자 버튼 클릭 처리 함수
  const handleNumberClick = (
    event: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    const value = event.currentTarget.value;
    if (state.isNewNumber) {
      // 현재 숫자를 새로운 숫자로 대체
      setState({
        ...state,
        currentNumber: value,
        isNewNumber: false,
      });
    } else {
      // 기존 숫자에 새로운 숫자를 이어 붙임
      setState({
        ...state,
        currentNumber: state.currentNumber + value,
      });
    }
  };

  // 연산 기호 버튼 클릭 처리 함수
  const handleOperatorClick = (
    event: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    if (state.currentNumber === '0') return;
    // 현재 클릭한 연산 기호 가져오기
    const operator = event.currentTarget.value;
    // 현재 출력칸에 표시된 숫자를 숫자형으로 변환
    const current = parseFloat(state.currentNumber || '0');
    // 이전 숫자와 연산 기호가 모두 있는 경우(연속 연산)
    if (state.previousNumber !== '' && state.operation) {
      const prev = parseFloat(state.previousNumber);
      let result = 0;
      // 연산 기호에 따라 연산 수행
      switch (state.operation) {
        case '+':
          result = new Decimal(prev).plus(current).toNumber();
          break;
        case '-':
          result = new Decimal(prev).minus(current).toNumber();
          break;
        case '*':
          result = new Decimal(prev).times(current).toNumber();
          break;
        case '/':
          result = new Decimal(prev).dividedBy(current).toNumber();
          break;
      }
      if (operator === '=') {
        // = 버튼 클릭 시 연산 종료
        setState({
          currentNumber: result.toString(),
          previousNumber: '',
          operation: null,
          isNewNumber: true,
        });
      } else {
        // 다른 연산 기호 버튼 클릭 시 연산 유지
        setState({
          currentNumber: '',
          previousNumber: result.toString(),
          operation: operator,
          isNewNumber: true,
        });
      }
    } else if (state.currentNumber !== '' && operator === '=') {
      setState({
        ...state,
        isNewNumber: true,
      });
    } else {
      // 첫 번째 숫자 입력 후 연산 기호 버튼 클릭 시
      setState({
        currentNumber: '',
        previousNumber: current.toString(),
        operation: operator,
        isNewNumber: true,
      });
    }
  };

  // C 버튼 클릭 처리 함수: 모든 상태 초기화
  const handleClear = () => {
    setState({
      currentNumber: '0',
      previousNumber: '',
      operation: null,
      isNewNumber: true,
    });
  };

  // 소수점 버튼 클릭 처리 함수: 현재 숫자에 소수점이 없을 경우에만 추가
  const handleDot = () => {
    if (!state.currentNumber.includes('.')) {
      setState({
        ...state,
        currentNumber: state.currentNumber + '.',
        isNewNumber: false,
      });
    }
  };

  return (
    <>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setIsDarkMode((prev) => !prev)}
      >
        {isDarkMode ? "☀️" : "🌙"}
      </button>

      <article className={`calculator ${isDarkMode ? "dark" : ""}`}>
        <form name="forms">
          <input type="text" name="output" value={state.currentNumber} readOnly />
          <input type="button" className="clear" value="C" onClick={handleClear} />
          <input type="button" className="operator" value="/" onClick={handleOperatorClick} />
          <input type="button" value="1" onClick={handleNumberClick} />
          <input type="button" value="2" onClick={handleNumberClick} />
          <input type="button" value="3" onClick={handleNumberClick} />
          <input type="button" className="operator" value="*" onClick={handleOperatorClick} />
          <input type="button" value="4" onClick={handleNumberClick} />
          <input type="button" value="5" onClick={handleNumberClick} />
          <input type="button" value="6" onClick={handleNumberClick} />
          <input type="button" className="operator" value="+" onClick={handleOperatorClick} />
          <input type="button" value="7" onClick={handleNumberClick} />
          <input type="button" value="8" onClick={handleNumberClick} />
          <input type="button" value="9" onClick={handleNumberClick} />
          <input type="button" className="operator" value="-" onClick={handleOperatorClick} />
          <input type="button" className="dot" value="." onClick={handleDot} />
          <input type="button" value="0" onClick={handleNumberClick} />
          <input type="button" className="operator result" value="=" onClick={handleOperatorClick} />
        </form>
      </article>
    </>
  );
}