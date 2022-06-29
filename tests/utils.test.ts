import 'ts-jest/utils';
import { cellToIndex, columnIndexToLetter } from '../src/utils';


describe('Test Utils', () => {
  it(`Utils: Should convert Cell to col and row index`, () => {
    expect(cellToIndex('A1')).toEqual({ col: 0, row: 0 })
    expect(cellToIndex('AB1234')).toEqual({ col: 27, row: 1233 })
  })

  it(`Utils: Should convert index number to column letter`, () => {
    expect(columnIndexToLetter(0)).toEqual('A')
    expect(columnIndexToLetter(26)).toEqual('AA')
  })
});
