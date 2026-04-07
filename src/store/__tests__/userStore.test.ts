import { useUserStore } from '../userStore';

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      coins: 100,
      level: 1,
      isPremium: false,
      premiumType: 'none',
      totalPlayTime: 0,
      totalCleared: 0,
    });
  });

  test('초기 코인은 100이다', () => {
    expect(useUserStore.getState().coins).toBe(100);
  });

  test('addCoins는 코인을 추가한다', () => {
    useUserStore.getState().addCoins(50);
    expect(useUserStore.getState().coins).toBe(150);
  });

  test('spendCoins는 코인을 차감하고 true를 반환한다', () => {
    const result = useUserStore.getState().spendCoins(30);
    expect(result).toBe(true);
    expect(useUserStore.getState().coins).toBe(70);
  });

  test('spendCoins는 잔액 부족 시 false를 반환한다', () => {
    const result = useUserStore.getState().spendCoins(200);
    expect(result).toBe(false);
    expect(useUserStore.getState().coins).toBe(100);
  });

  test('incrementLevel은 레벨을 1 올린다', () => {
    useUserStore.getState().incrementLevel();
    expect(useUserStore.getState().level).toBe(2);
  });

  test('setPremium은 구독 상태를 설정한다', () => {
    useUserStore.getState().setPremium(true, 'subscription');
    expect(useUserStore.getState().isPremium).toBe(true);
    expect(useUserStore.getState().premiumType).toBe('subscription');
  });

  test('setPremium(false)는 premiumType을 none으로 설정한다', () => {
    useUserStore.getState().setPremium(true, 'lifetime');
    useUserStore.getState().setPremium(false, 'lifetime');
    expect(useUserStore.getState().isPremium).toBe(false);
    expect(useUserStore.getState().premiumType).toBe('none');
  });

  test('addPlayTime은 플레이 시간을 누적한다', () => {
    useUserStore.getState().addPlayTime(60);
    useUserStore.getState().addPlayTime(30);
    expect(useUserStore.getState().totalPlayTime).toBe(90);
  });

  test('incrementCleared는 클리어 수를 1 올린다', () => {
    useUserStore.getState().incrementCleared();
    useUserStore.getState().incrementCleared();
    expect(useUserStore.getState().totalCleared).toBe(2);
  });
});
