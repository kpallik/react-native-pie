import React, { PureComponent } from 'react';
import { Text, View } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import type { Dispatch } from 'redux';
import PieChart from 'react-native-pie';
import _ from 'lodash';
import {
  CashbackBonusFormatter,
  theme2,
  styleGuide2,
  DFSStyleSheet,
} from 'discover-common-components';
import { toNumberFormat, currencyFormatter } from 'discover-utils/money';
import { onlySignedNumbers } from 'discover-utils/text';

import { TouchableIcon, Icon, Divider } from '../../../../core/components/styleGuideComponents';
import { dateToMonthDYYYYFormat } from '../../../../lib/utils/date';
import { getCardAccount } from '../../../../core/customer/customerSelector';
import * as routeActions from '../../../../core/navigation/routing/routeActions';
import TileComponent from '../../../../core/components/view/TileComponent';
import type { CardAccount } from '../../../../core/customer/CustomerTypeDefinitions';
import type { TrackerDetails, TrackerPieSections } from '../rewardsLevel1TypeDefinitions';
import {
  getMatchStartDate,
  getPromoTooltipData,
  shouldShowPromoTooltip,
} from '../rewardsLevel1Utils';
import { isScreenReaderEnabled } from '../../../../core/device/deviceSelector';
import { getDonutDetails, getIsMilesCard, getIsMoreCard } from '../rewardsLevel1Selectors';
import {
  REWARDS_DETAILS_TOOLTIP_TEXT,
  TOTAL_EARNED_TOOLTIP_TEXT,
  NEGATIVE_TOTAL_EARNED_TOOLTIP_TEXT,
} from '../rewardsLevel1Constants';

const { CARD_REWARDS_TRACKER_TOOLTIP_MODAL } = require('../../../../lib/constants').default;

const START_EARNING_TEXT =
  "We'll match all the cash back you earn between now and ~endDate~, dollar for dollar.";
const MILES_START_EARNING_TEXT =
  "We'll match all the miles you earn between now and ~endDate~, mile for mile.";

const mapStateToProps = state => ({
  trackerDetails: state.card.rewards.rewardsLevel1.trackerDetails,
  cardAccount: getCardAccount(state),
  pieSections: getDonutDetails(state),
  isMilesCard: getIsMilesCard(state),
  isMoreCard: getIsMoreCard(state),
  isReaderEnabled: isScreenReaderEnabled(state),
});

const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  routeActions: bindActionCreators(routeActions, dispatch),
});

type Props = {
  trackerDetails: TrackerDetails,
  pieSections: TrackerPieSections,
  cardAccount: CardAccount,
  isMilesCard: boolean,
  isMoreCard: boolean,
  routeActions: typeof routeActions,
  isReaderEnabled: boolean,
};

class RewardsTrackerTile extends PureComponent<Props> {
  _getFormattedValue(value) {
    const { isMilesCard } = this.props;
    const trimmedValue = `${_.clamp(value)}`;
    return isMilesCard ? toNumberFormat(trimmedValue) : currencyFormatter(value);
  }

  _getTooltipModalBody(body) {
    const { isMilesCard } = this.props;
    return isMilesCard
      ? body.replace(/Cashback Bonus/g, 'Miles').replace(/Cash back/g, 'Miles')
      : body.replace(/Cashback Bonus/g, '<i>Cashback Bonus</i>');
  }

  _renderTooltipIcon(iconStyle, onPress) {
    return (
      <TouchableIcon
        name="question-circle"
        size={13}
        testID="Help"
        style={[styles.helpIcon, iconStyle]}
        onPress={onPress}
      />
    );
  }

  _onTotalTooltipIconPress(hasNegativeTotalPromo, isMatch, matchStartDate) {
    const tooltipText = hasNegativeTotalPromo
      ? NEGATIVE_TOTAL_EARNED_TOOLTIP_TEXT
      : TOTAL_EARNED_TOOLTIP_TEXT;
    const date = isMatch ? matchStartDate : 'this year';
    const body = tooltipText.replace('~date~', date);
    const content = this._getTooltipModalBody(body);

    this.props.routeActions.navigate({
      routeName: CARD_REWARDS_TRACKER_TOOLTIP_MODAL,
      title: 'Total',
      content,
    });
  }

  _onRewardsDetailsTooltipIconPress = () => {
    this.props.routeActions.navigate({
      routeName: CARD_REWARDS_TRACKER_TOOLTIP_MODAL,
      title: 'Details',
      content: REWARDS_DETAILS_TOOLTIP_TEXT,
    });
  };

  _onPromoDescriptionTooltipIconPress(tooltipData) {
    const { title, text } = tooltipData;
    const content = this._getTooltipModalBody(text);
    this.props.routeActions.navigate({
      routeName: CARD_REWARDS_TRACKER_TOOLTIP_MODAL,
      title,
      content,
    });
  }

  _renderRewardsTrackerTitle() {
    const {
      isMilesCard,
      isReaderEnabled,
      trackerDetails: { matchView, beginDate, lastStatementDate },
    } = this.props;
    const formattedLastStatementDate = dateToMonthDYYYYFormat(lastStatementDate);
    const rewardType = isMilesCard ? 'Miles' : 'Cashback Bonus®';
    const noMatchTitle = `Total ${rewardType} earned this year as of ${formattedLastStatementDate}`;
    const matchTitle = `Total ${rewardType} ${getMatchStartDate(
      beginDate,
      lastStatementDate,
    )} through ${formattedLastStatementDate}`;
    const title = matchView ? matchTitle : noMatchTitle;

    return (
      <CashbackBonusFormatter cbbTextStyle={styles.cashbackBonusText}>
        <Text
          style={styles.trackerTitle}
          testID="Text_TotalEarned"
          onPress={isReaderEnabled ? this._onRewardsDetailsTooltipIconPress : undefined}
        >
          {`${title}  `}
          <Icon
            name="question-circle"
            size={13}
            testID="Help"
            style={styles.helpIcon}
            onPress={this._onRewardsDetailsTooltipIconPress}
          />
        </Text>
      </CashbackBonusFormatter>
    );
  }

  _renderTrackerDonut() {
    const {
      pieSections,
      isMilesCard,
      trackerDetails: { matchView, beginDate, totalPromoValue },
    } = this.props;
    const totalPromo = onlySignedNumbers(totalPromoValue);
    const title = isMilesCard ? 'Miles Total' : 'Total';
    const hasNegativeTotalPromo = +totalPromo < 0;

    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <PieChart
          radius={150}
          innerRadius={125}
          sections={_.orderBy(pieSections, ['percentage'], ['desc'])}
          dividerSize={2}
          strokeCap="round"
        />
        <View style={styles.totalPromoContainer}>
          {this._renderAmount(totalPromoValue)}
          <View style={{ flexDirection: 'row' }}>
            <Text style={styleGuide2.title3} testID="Text_Total">
              {title}
            </Text>
            {this._renderTooltipIcon({ padding: 5 }, () => {
              this._onTotalTooltipIconPress(hasNegativeTotalPromo, matchView, beginDate);
            })}
          </View>
        </View>
      </View>
    );
  }

  _renderTrackerPromotionDetails() {
    const {
      isMilesCard,
      isMoreCard,
      cardAccount: { cardProductGroupCode },
      trackerDetails: { rewardsPromotions, beginDate, endDate, cardConverted },
    } = this.props;

    if (!_.isEmpty(rewardsPromotions)) {
      return rewardsPromotions.map((promotion, index) => {
        const { promoDescription, promoGroup, promoValue, displayAttributes } = promotion;
        const formattedValue = this._getFormattedValue(promoValue);
        const suffix = isMilesCard ? ' Miles' : '';
        const shouldDisplayTooltipIcon = shouldShowPromoTooltip(isMoreCard, promoGroup);

        return (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 10 }}
            key={index}
          >
            <Icon
              name="dfs-circle"
              size={8}
              testID="Circle"
              color={`#${displayAttributes.colorCode}`}
            />
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <CashbackBonusFormatter cbbTextStyle={styles.cashbackBonusText}>
                <Text
                  style={[styleGuide2.body5, { paddingLeft: 10 }]}
                  testID="Text_PromoDescription"
                >
                  {promoDescription}
                </Text>
              </CashbackBonusFormatter>
              {shouldDisplayTooltipIcon &&
                this._renderTooltipIcon({ paddingHorizontal: 5 }, () => {
                  const tooltipData = getPromoTooltipData(
                    promoDescription,
                    promoGroup,
                    cardProductGroupCode,
                    beginDate,
                    endDate,
                    cardConverted,
                  );
                  this._onPromoDescriptionTooltipIconPress(tooltipData);
                })}
            </View>
            <Text style={styleGuide2.body5} testID="Text_PromotionValue">
              {`${formattedValue}${suffix}`}
            </Text>
          </View>
        );
      });
    }
  }

  _renderAmount(amount, suffix = '') {
    const { isMilesCard } = this.props;
    const signedAmount = onlySignedNumbers(amount);
    const hasNegativeTotalPromo = +signedAmount < 0;
    const formattedTotalValue = this._getFormattedValue(signedAmount);

    return (
      <View style={{ flexDirection: 'row' }}>
        {hasNegativeTotalPromo && (
          <Text style={styles.amountValue} testID="Text_Minus">
            -
          </Text>
        )}
        {!isMilesCard && (
          <Text style={styles.amountDollar} testID="Text_Dollar">
            $
          </Text>
        )}
        <Text style={styles.amountValue} testID="Text_Amount">
          {`${formattedTotalValue.replace(/[$-]/g, '')}${suffix}`}
        </Text>
      </View>
    );
  }

  _getZeroCashbackMatchContent(matchEndDate) {
    const { isMilesCard } = this.props;
    const earningText = isMilesCard ? MILES_START_EARNING_TEXT : START_EARNING_TEXT;
    const content = earningText.replace('~endDate~', matchEndDate);

    return (
      <View>
        <Text
          style={[styleGuide2.title3, { paddingVertical: 20, textAlign: 'center' }]}
          testID="Text_StartEarningTitle"
        >
          Start earning now!
        </Text>
        <Text
          style={[styleGuide2.body5, { textAlign: 'center', paddingHorizontal: 50 }]}
          testID="Text_StartEarningText"
        >
          {content}
        </Text>
      </View>
    );
  }

  _getMatchContent(isPreMatch) {
    const { isMilesCard, trackerDetails } = this.props;
    const { accumulatedPayout, milesConvertedAmount, matchPayoutDate } = trackerDetails;
    const suffix = isMilesCard ? ' Miles' : '';

    return (
      <View>
        {isPreMatch && (
          <Text style={styleGuide2.title3} testID="Text_Congrats">
            Congrats!
          </Text>
        )}
        <Text
          style={[styleGuide2.body5, { paddingBottom: 8, paddingTop: 20 }]}
          testID="Text_WillGiveAnother"
        >
          {"We'll give you another"}
        </Text>
        {this._renderAmount(accumulatedPayout, suffix)}
        {isMilesCard && (
          <Text style={styleGuide2.body5} testID="Text_ConvertedAmount">
            ({currencyFormatter(milesConvertedAmount)})
          </Text>
        )}
        <Text style={[styleGuide2.body5, { marginTop: 20 }]} testID="Text_RedeemAvailable">
          Available to redeem on
        </Text>
        <Text style={styleGuide2.body5} testID="Text_MatchPayoutDate">
          {dateToMonthDYYYYFormat(matchPayoutDate)}
        </Text>
        {!isPreMatch && (
          <Text style={[styleGuide2.body5, { marginTop: 20 }]} testID="Text_MoreWeMatch">
            {"The more you earn, the more we'll match!"}
          </Text>
        )}
      </View>
    );
  }

  _renderAdditionalTile() {
    const { isMilesCard, trackerDetails } = this.props;
    const { matchView, matchStatus, endDate, zeroCashbackMatchEarn } = trackerDetails;
    const isPreMatch = matchStatus === 'CMP';
    const title = isMilesCard ? 'Discover Match®' : 'Cashback Match';
    let contentView = '';

    if (zeroCashbackMatchEarn) {
      contentView = this._getZeroCashbackMatchContent(endDate);
    } else if (matchStatus === 'ACT' || isPreMatch) {
      contentView = this._getMatchContent(isPreMatch);
    }

    if (matchView && !!contentView) {
      return (
        <View>
          <Divider dividerStyle={{ marginVertical: 20 }} />
          <View style={{ alignItems: 'center', marginBottom: 25 }}>
            <Text style={styleGuide2.title3} testID="Text_MatchTitle">
              {title}
            </Text>
            {contentView}
          </View>
        </View>
      );
    }
  }

  render() {
    return (
      <TileComponent key="RewardsTracker">
        {this._renderRewardsTrackerTitle()}
        {this._renderTrackerDonut()}
        {this._renderTrackerPromotionDetails()}
        {this._renderAdditionalTile()}
      </TileComponent>
    );
  }
}

const styles = DFSStyleSheet.create({
  totalPromoContainer: {
    position: 'absolute',
    height: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountDollar: {
    ...styleGuide2.body6,
    marginTop: 6,
  },
  amountValue: {
    ...styleGuide2.title3,
    fontSize: 34,
    lineHeight: 40,
  },
  helpIcon: {
    ios: {
      color: theme2.discoverBlue,
    },
    android: {
      color: theme2.midGrey,
    },
  },
  trackerTitle: {
    ...styleGuide2.body5,
    lineHeight: 18,
    marginTop: 15,
  },
  cashbackBonusText: {
    ...styleGuide2.body5,
    android: {
      fontStyle: 'normal',
      fontFamily: theme2.robotoMediumItalic,
    },
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RewardsTrackerTile);
