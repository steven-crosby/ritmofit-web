// Reviewer D repro. To run: in a disposable worktree, copy lines 1-283 of
// apps/web/src/components/Dashboard.test.tsx (imports, mocks, helpers, beforeEach/afterEach)
// into apps/web/src/components/d-audit-fanout.test.tsx, append this block, then
// `cd apps/web && npx vitest run src/components/d-audit-fanout.test.tsx`.


// Audit repro (reviewer D): count run-payload requests across destination switches.
describe('d-audit run-payload fan-out', () => {
  for (const n of [5, 30]) {
    it(`counts getRunPayload calls for a ${n}-class library`, async () => {
      const classes = Array.from({ length: n }, (_, i) => ({
        ...makeClass(`Ride ${i}`),
        trackCount: 3,
        totalDurationMs: 1_800_000,
      }));
      vi.mocked(api.listClasses).mockResolvedValue(page(classes));
      vi.mocked(api.getRunPayload).mockImplementation(async () => ({
        ...liveRunPayload([{ classTrackId: 'ct-1', durationMs: 1_800_000 }]),
        sections: [],
      }));
      vi.mocked(api.getClassShelfPayload).mockImplementation(async () => ({
        ...liveRunPayload([{ classTrackId: 'ct-1', durationMs: 1_800_000 }]),
        sections: [],
      }));
      const shelf = () => vi.mocked(api.getClassShelfPayload).mock.calls.length;
      const calls = () => vi.mocked(api.getRunPayload).mock.calls.length + shelf();
      const listCalls = () => vi.mocked(api.listClasses).mock.calls.length;
      const settle = async () => {
        let last = -1;
        for (let i = 0; i < 40 && last !== calls(); i++) {
          last = calls();
          await act(async () => {
            await new Promise((r) => setTimeout(r, 25));
          });
        }
      };
      renderDashboard();
      await screen.findAllByText('Ride 0');
      await settle();
      const home = calls();
      const homeShelf = shelf();
      fireEvent.click(screen.getByRole('button', { name: 'Live' }));
      await settle();
      const live1 = calls();
      fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
      await settle();
      const back = calls();
      fireEvent.click(screen.getByRole('button', { name: 'Live' }));
      await settle();
      const live2 = calls();
      const shelfTotal = shelf();
      console.log(
        `D-FANOUT n=${n} listClasses=${listCalls()} runPayload: classesHome=${home} +live=${live1 - home} +classesAgain=${back - live1} +liveAgain=${live2 - back} total=${live2} (shelf: home=${homeShelf} all=${shelfTotal})`,
      );
      expect(live2).toBeGreaterThan(0);
    });
  }
});
