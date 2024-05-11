import styled from 'styled-components';

export const Wrapper = styled.div`
  background: #fff;
  border-radius: 24px;
  border: 1px solid #f5f5f5;
  padding: 24px;
  position: relative;
  flex-shrink: 0;
`;

export const Group = styled.div`
  border: 1px solid #eaeaea;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  position: relative;
  max-width: 360px;
`;

export const GroupLabel = styled.div`
  background: #fff;
  color: gray;
  font-size: 12px;
  left: 16px;
  padding: 4px;
  position: absolute;
  top: 0;
  transform: translateY(-50%);
`;
