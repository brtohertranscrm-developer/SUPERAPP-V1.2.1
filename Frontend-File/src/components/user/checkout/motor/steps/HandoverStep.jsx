import React from 'react';
import HandoverMethodSection from './handover/HandoverMethodSection';
import TripDestinationSection from './handover/TripDestinationSection';
import AddonsSection from './handover/AddonsSection';

export default function HandoverStep(props) {
  const {
    pickupLocation,
    handoverMethod,
    setHandoverMethod,
    deliveryTarget,
    setDeliveryTarget,
    stationId,
    setStationId,
    stations,
    selectedStation,
    isDeliveryLoading,
    deliveryFee,
    deliveryAddress,
    setDeliveryAddress,
    mapsInput,
    setMapsInput,
    parsedLatLng,
    deliveryQuote,
    deliveryError,
    setDeliveryError,
    requestDeliveryQuote,
    tripScope,
    setTripScope,
    tripDestination,
    setTripDestination,
    tripDestinationError,
    setTripDestinationError,
    isAddonsLoading,
    addonsError,
    motorAddons,
    gearAddons,
    selectedAddons,
    otherAddons,
    setAddonQtyById,
    setAddonQty,
    addonTotal,
  } = props;

  return (
    <>
      <HandoverMethodSection
        pickupLocation={pickupLocation}
        handoverMethod={handoverMethod}
        setHandoverMethod={setHandoverMethod}
        deliveryTarget={deliveryTarget}
        setDeliveryTarget={setDeliveryTarget}
        stationId={stationId}
        setStationId={setStationId}
        stations={stations}
        selectedStation={selectedStation}
        isDeliveryLoading={isDeliveryLoading}
        deliveryFee={deliveryFee}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        mapsInput={mapsInput}
        setMapsInput={setMapsInput}
        parsedLatLng={parsedLatLng}
        deliveryQuote={deliveryQuote}
        deliveryError={deliveryError}
        setDeliveryError={setDeliveryError}
        requestDeliveryQuote={requestDeliveryQuote}
      />

      <TripDestinationSection
        tripScope={tripScope}
        setTripScope={setTripScope}
        tripDestination={tripDestination}
        setTripDestination={setTripDestination}
        tripDestinationError={tripDestinationError}
        setTripDestinationError={setTripDestinationError}
      />

      <AddonsSection
        isAddonsLoading={isAddonsLoading}
        addonsError={addonsError}
        motorAddons={motorAddons}
        gearAddons={gearAddons}
        selectedAddons={selectedAddons}
        otherAddons={otherAddons}
        setAddonQtyById={setAddonQtyById}
        setAddonQty={setAddonQty}
        addonTotal={addonTotal}
      />
    </>
  );
}

