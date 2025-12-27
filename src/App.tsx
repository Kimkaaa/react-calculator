import { useState } from "react";

export default function App() {
  // 계산기 상태 관리
  const [state, setState] = useState({
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
    console.log(event.currentTarget.value);
  };

  // C 버튼 클릭 처리 함수: 모든 상태 초기화
  const handleClear = () => {
    console.log('clear');
  };

  // 소수점 버튼 클릭 처리 함수: 현재 숫자에 소수점이 없을 경우에만 추가
  const handleDot = () => {
    console.log('dot');
  };
  return (
    <article className="calculator">
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
  );
}