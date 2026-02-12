import { createContext, useContext, useState, type ReactNode } from "react";

interface FundDetailContextValue {
  selectedFundCode: string | null;
  openFundDetail: (code: string) => void;
  closeFundDetail: () => void;
}

const FundDetailContext = createContext<FundDetailContextValue>({
  selectedFundCode: null,
  openFundDetail: () => {},
  closeFundDetail: () => {},
});

export function FundDetailProvider({ children }: { children: ReactNode }) {
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);

  return (
    <FundDetailContext.Provider
      value={{
        selectedFundCode,
        openFundDetail: setSelectedFundCode,
        closeFundDetail: () => setSelectedFundCode(null),
      }}
    >
      {children}
    </FundDetailContext.Provider>
  );
}

export function useFundDetail() {
  return useContext(FundDetailContext);
}
