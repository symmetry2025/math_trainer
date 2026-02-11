import { cn } from '../../../lib/utils';

export function MultiplicationTable(props: {
  highlightRow?: number | null;
  highlightCol?: number | null;
  selectedCell?: { row: number; col: number } | null;
  selectedStatus?: 'correct' | 'wrong' | null;
  onPickCell?: (row: number, col: number) => void;
}) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const highlightRow = props.highlightRow ?? null;
  const highlightCol = props.highlightCol ?? null;

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-10 h-10 bg-muted rounded-tl-lg"></th>
            {numbers.map((num) => (
              <th
                key={num}
                className={cn(
                  'w-10 h-10 font-bold text-center transition-colors',
                  highlightCol === num ? 'bg-selected text-selected-foreground' : 'bg-muted text-muted-foreground',
                  num === 10 && 'rounded-tr-lg',
                )}
              >
                {num}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {numbers.map((row, rowIndex) => (
            <tr key={row}>
              <td
                className={cn(
                  'w-10 h-10 font-bold text-center transition-colors',
                  highlightRow === row ? 'bg-selected text-selected-foreground' : 'bg-muted text-muted-foreground',
                  rowIndex === 9 && 'rounded-bl-lg',
                )}
              >
                {row}
              </td>
              {numbers.map((col, colIndex) => {
                const result = row * col;
                const isHighlighted = highlightRow === row || highlightCol === col;
                const isSelected = props.selectedCell?.row === row && props.selectedCell?.col === col;
                const isSelectedCorrect = isSelected && props.selectedStatus === 'correct';
                const isSelectedWrong = isSelected && props.selectedStatus === 'wrong';
                const clickable = typeof props.onPickCell === 'function';

                return (
                  <td
                    key={col}
                    onClick={clickable ? () => props.onPickCell?.(row, col) : undefined}
                    className={cn(
                      'w-10 h-10 text-center font-medium border border-border/50 transition-all select-none',
                      clickable && 'cursor-pointer hover:bg-muted/50',
                      isSelectedCorrect
                        ? 'bg-success text-success-foreground font-bold scale-110 z-10 relative shadow-lg rounded-lg'
                        : isSelectedWrong
                          ? 'bg-destructive text-destructive-foreground font-bold scale-110 z-10 relative shadow-lg rounded-lg'
                          : isHighlighted
                            ? 'bg-selected/20 text-selected font-semibold'
                            : 'bg-card text-foreground',
                      rowIndex === 9 && colIndex === 9 && 'rounded-br-lg',
                    )}
                  >
                    {result}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

